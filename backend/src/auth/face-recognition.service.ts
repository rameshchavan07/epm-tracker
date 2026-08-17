import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as faceapi from 'face-api.js';
import * as canvas from 'canvas';
import * as path from 'path';
import * as fs from 'fs';

// Monkey-patch face-api.js to use node-canvas (kept as fallback)
const { Canvas, Image, ImageData } = canvas;
// @ts-expect-error face-api.js requires patching for Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

export interface FaceEnrollResult {
  success: boolean;
  message: string;
  employeeCode: string;
  enrolledAt: string;
}

export interface FaceVerifyResult {
  match: boolean;
  confidence: number;
  distance: number;
  threshold: number;
  message: string;
  employeeCode?: string;
}

@Injectable()
export class FaceRecognitionService implements OnModuleInit {
  private readonly logger = new Logger(FaceRecognitionService.name);
  private modelsLoaded = false;
  private readonly matchThreshold: number;
  private readonly globalMatchThreshold: number;
  private readonly arcfaceServiceUrl: string;
  private arcfaceAvailable = false;

  constructor(private prisma: PrismaService) {
    this.matchThreshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.5');
    this.globalMatchThreshold = parseFloat(process.env.FACE_GLOBAL_MATCH_THRESHOLD || '0.35');
    this.arcfaceServiceUrl = process.env.ARCFACE_SERVICE_URL || 'http://localhost:5050';
  }

  async onModuleInit() {
    await this.checkArcfaceService();
    if (!this.arcfaceAvailable) {
      await this.loadFallbackModels();
    }
  }

  /**
   * Check if the ArcFace Python microservice is running.
   */
  private async checkArcfaceService(): Promise<void> {
    try {
      const res = await fetch(`${this.arcfaceServiceUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        this.arcfaceAvailable = true;
        this.logger.log(`ArcFace microservice is available at ${this.arcfaceServiceUrl} (512D embeddings)`);
      }
    } catch {
      this.arcfaceAvailable = false;
      this.logger.warn(
        `ArcFace microservice not reachable at ${this.arcfaceServiceUrl}. Falling back to face-api.js (128D).`,
      );
    }
  }

  /**
   * Load face-api.js neural network models from disk (fallback only).
   */
  private async loadFallbackModels(): Promise<void> {
    const modelsDir = path.join(process.cwd(), 'models');

    if (!fs.existsSync(modelsDir)) {
      this.logger.warn(`Models directory not found at ${modelsDir}. Face recognition fallback enabled.`);
      return;
    }

    try {
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsDir);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsDir);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsDir);
      this.modelsLoaded = true;
      this.logger.log('face-api.js fallback models loaded successfully (128D)');
    } catch (error) {
      this.logger.error('Failed to load face-api.js fallback models', error);
    }
  }

  isReady(): boolean {
    return this.arcfaceAvailable || this.modelsLoaded;
  }

  /**
   * Extract 512D face embedding via ArcFace Python microservice.
   * Returns null if no face is detected.
   */
  private async extractDescriptorArcFace(base64Image: string): Promise<number[] | null> {
    try {
      const res = await fetch(`${this.arcfaceServiceUrl}/extract-embedding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
        signal: AbortSignal.timeout(15000),
      });

      const data = (await res.json()) as {
        detected: boolean;
        embedding: number[];
        message: string;
      };

      if (!data.detected || !data.embedding || data.embedding.length === 0) {
        this.logger.warn(`ArcFace: no face detected — ${data.message}`);
        return null;
      }

      return data.embedding;
    } catch (err) {
      this.logger.error('ArcFace microservice call failed', err);
      return null;
    }
  }

  /**
   * Extract 128D face descriptor via face-api.js (fallback).
   */
  async extractDescriptor(base64Image: string): Promise<Float32Array | null> {
    if (!this.modelsLoaded) {
      return null;
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    const img = await canvas.loadImage(imgBuffer);
    const cvs = canvas.createCanvas(img.width, img.height);
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const detection = await faceapi
      .detectSingleFace(cvs as unknown as HTMLCanvasElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return detection.descriptor;
  }

  compareDescriptors(
    descriptor1: Float32Array | number[],
    descriptor2: Float32Array | number[],
  ): number {
    const a = Array.from(descriptor1);
    const b = Array.from(descriptor2);
    // If dimensions differ (128D vs 512D mismatch during transition) return max distance
    if (a.length !== b.length) {
      return 1.0;
    }
    // Euclidean distance — works for any dimension
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Extract descriptor using ArcFace (primary) or face-api.js (fallback).
   */
  private async extractBestDescriptor(
    base64Image: string,
  ): Promise<{ vector: number[]; source: 'arcface' | 'faceapi' } | null> {
    // Primary: ArcFace 512D
    if (this.arcfaceAvailable) {
      const vec = await this.extractDescriptorArcFace(base64Image);
      if (vec) return { vector: vec, source: 'arcface' };
      return null; // face not detected by ArcFace
    }

    // Fallback: face-api.js 128D
    if (this.modelsLoaded) {
      const descriptor = await this.extractDescriptor(base64Image);
      if (descriptor) return { vector: Array.from(descriptor), source: 'faceapi' };
      return null;
    }

    return null;
  }

  /**
   * Enroll a new face profile for an employee + device combination.
   * Also inserts a new 'LOGIN' event row into LoginLog.
   */
  async enrollFace(
    employeeCode: string,
    deviceId: string,
    base64Image: string,
    latitude?: number,
    longitude?: number,
  ): Promise<FaceEnrollResult> {
    // Check 1: Is Employee Code already registered?
    const existingEmp = await this.prisma.faceProfile.findFirst({
      where: {
        employee_code: employeeCode,
        delete_flag: 'N',
      },
    });
    if (existingEmp) {
      return {
        success: false,
        message: 'This employee is already registered with another device.',
        employeeCode,
        enrolledAt: '',
      };
    }

    // Check 2: Is Device ID already registered?
    const existingDev = await this.prisma.faceProfile.findFirst({
      where: {
        device_id: deviceId,
        delete_flag: 'N',
      },
    });
    if (existingDev) {
      return {
        success: false,
        message: 'This device is already registered with another employee.',
        employeeCode,
        enrolledAt: '',
      };
    }

    // Extract face descriptor (ArcFace 512D primary, face-api.js 128D fallback)
    const result = await this.extractBestDescriptor(base64Image);
    if (!result) {
      return {
        success: false,
        message: 'No face detected in the image. Please ensure your face is clearly visible.',
        employeeCode,
        enrolledAt: '',
      };
    }

    const descriptorArray = result.vector;
    this.logger.log(
      `Descriptor extracted via ${result.source} (dim=${descriptorArray.length}) for ${employeeCode}`,
    );

    // Check 3: Is Face already registered globally?
    // Uses globalMatchThreshold (0.35) — stricter 1-to-N uniqueness, not 1-to-1 login threshold
    const allActiveProfiles = await this.prisma.faceProfile.findMany({
      where: { delete_flag: 'N' },
    });
    for (const p of allActiveProfiles) {
      if (p.registered_face_descriptor && p.registered_face_descriptor.length > 0) {
        const dist = this.compareDescriptors(descriptorArray, p.registered_face_descriptor);
        if (dist < this.globalMatchThreshold) {
          return {
            success: false,
            message: 'This face is already registered.',
            employeeCode,
            enrolledAt: '',
          };
        }
      }
    }

    const now = new Date();

    const profile = await this.prisma.faceProfile.create({
      data: {
        employee_code: employeeCode,
        device_id: deviceId,
        registered_face_descriptor: descriptorArray,
        registered_face_image: base64Image,
        registered_by: '',
        registered_date_time: now,
        last_login_image: base64Image,
        last_login_date_time: now,
        login_status: 'Y',
        delete_flag: 'N',
        last_changed_date_time: now,
      },
    });

    // Record LOGIN event in LoginLog (INSERT only)
    try {
      await this.prisma.loginLog.create({
        data: {
          employee_code: employeeCode,
          event: 'LOGIN',
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          date_time: now,
        },
      });
      this.logger.log(`Inserted LOGIN record in LoginLog for employee ${employeeCode}`);
    } catch (logErr) {
      this.logger.error(`Failed to insert LoginLog record on enrollment:`, logErr);
    }

    this.logger.log(
      `Face enrolled successfully for employee ${employeeCode} on device ${deviceId} with registered_by=''`,
    );

    return {
      success: true,
      message: 'Face profile enrolled successfully',
      employeeCode,
      enrolledAt: profile.registered_date_time.toISOString(),
    };
  }

  /**
   * Verify a face against stored FaceProfile using employee_code + device_id.
   * Inserts a new LOGIN or LOGOUT event row in LoginLog upon successful verification.
   */
  async verifyFace(
    employeeCode: string,
    deviceId: string,
    base64Image: string,
    isLogout = false,
    latitude?: number,
    longitude?: number,
  ): Promise<FaceVerifyResult> {
    let profile = await this.prisma.faceProfile.findFirst({
      where: {
        employee_code: employeeCode,
        device_id: deviceId,
        delete_flag: 'N',
      },
    });

    if (!profile && employeeCode) {
      profile = await this.prisma.faceProfile.findFirst({
        where: { employee_code: employeeCode, delete_flag: 'N' },
      });
    }

    if (!profile && deviceId) {
      profile = await this.prisma.faceProfile.findFirst({
        where: { device_id: deviceId, delete_flag: 'N' },
      });
    }

    if (!profile) {
      return {
        match: false,
        confidence: 0,
        distance: 1,
        threshold: this.matchThreshold,
        message: 'No face profile found for this employee. Please register your face first.',
      };
    }

    let isMatch = true;
    let distance = 0;
    let confidence = 100;

    const storedDescriptor = profile.registered_face_descriptor;

    if (storedDescriptor && storedDescriptor.length > 0) {
      const result = await this.extractBestDescriptor(base64Image);
      if (!result) {
        return {
          match: false,
          confidence: 0,
          distance: 1,
          threshold: this.matchThreshold,
          message: 'No face detected in the image. Please ensure your face is clearly visible.',
          employeeCode: profile.employee_code,
        };
      }

      const newDescriptor = result.vector;
      distance = this.compareDescriptors(newDescriptor, storedDescriptor);
      isMatch = distance < this.matchThreshold;
      confidence = Math.max(0, Math.round((1 - distance / this.matchThreshold) * 100));
    }

    if (isMatch) {
      const now = new Date();
      try {
        await this.prisma.faceProfile.update({
          where: {
            employee_code_device_id: {
              employee_code: profile.employee_code,
              device_id: profile.device_id,
            },
          },
          data: {
            last_login_image: base64Image,
            last_login_date_time: now,
            login_status: isLogout ? 'N' : 'Y',
            last_changed_date_time: now,
          },
        });
      } catch (dbErr) {
        this.logger.error('Failed to update face profile login status in database', dbErr);
      }

      // Record LOGIN or LOGOUT event in LoginLog (INSERT only)
      try {
        const eventType = isLogout ? 'LOGOUT' : 'LOGIN';
        await this.prisma.loginLog.create({
          data: {
            employee_code: profile.employee_code,
            event: eventType,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            date_time: now,
          },
        });
        this.logger.log(
          `Inserted ${eventType} record in LoginLog for employee ${profile.employee_code}`,
        );
      } catch (logErr) {
        this.logger.error('Failed to insert LoginLog record:', logErr);
      }
    }

    return {
      match: isMatch,
      confidence,
      distance: parseFloat(distance.toFixed(4)),
      threshold: this.matchThreshold,
      message: isMatch ? 'Face verified successfully' : 'Face does not match the enrolled profile',
      employeeCode: profile.employee_code,
    };
  }
}
