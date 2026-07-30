import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as faceapi from 'face-api.js';
import * as canvas from 'canvas';
import * as path from 'path';
import * as fs from 'fs';

// Monkey-patch face-api.js to use node-canvas
const { Canvas, Image, ImageData } = canvas;
// @ts-expect-error face-api.js requires patching for Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

export interface FaceEnrollResult {
  success: boolean;
  message: string;
  userId: string;
  enrolledAt: string;
}

export interface FaceVerifyResult {
  match: boolean;
  confidence: number;
  distance: number;
  threshold: number;
  message: string;
}

@Injectable()
export class FaceRecognitionService implements OnModuleInit {
  private readonly logger = new Logger(FaceRecognitionService.name);
  private modelsLoaded = false;
  private readonly matchThreshold: number;

  constructor(private prisma: PrismaService) {
    this.matchThreshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.6');
  }

  async onModuleInit() {
    await this.loadModels();
  }

  /**
   * Load face-api.js neural network models from disk.
   * Models must be present in backend/models/ directory.
   */
  private async loadModels(): Promise<void> {
    const modelsDir = path.join(process.cwd(), 'models');

    if (!fs.existsSync(modelsDir)) {
      this.logger.warn(
        `Models directory not found at ${modelsDir}. Face recognition will not work until models are downloaded.`,
      );
      return;
    }

    try {
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsDir);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsDir);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsDir);
      this.modelsLoaded = true;
      this.logger.log('Face recognition models loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load face recognition models', error);
    }
  }

  /**
   * Check if models are ready for inference.
   */
  isReady(): boolean {
    return this.modelsLoaded;
  }

  /**
   * Extract a 128-dimension face descriptor from a Base64-encoded JPEG image.
   * Returns null if no face is detected.
   */
  async extractDescriptor(base64Image: string): Promise<Float32Array | null> {
    if (!this.modelsLoaded) {
      throw new Error('Face recognition models are not loaded');
    }

    // Strip data URI prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');

    // Load the image using node-canvas
    const img = await canvas.loadImage(imgBuffer);

    // Create a canvas and draw the image
    const cvs = canvas.createCanvas(img.width, img.height);
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Detect face and extract descriptor
    const detection = await faceapi
      .detectSingleFace(cvs as unknown as HTMLCanvasElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      this.logger.warn('No face detected in the provided image');
      return null;
    }

    return detection.descriptor;
  }

  /**
   * Calculate Euclidean distance between two face descriptors.
   * Lower distance = more similar. Typically < 0.6 = same person.
   */
  compareDescriptors(
    descriptor1: Float32Array | number[],
    descriptor2: Float32Array | number[],
  ): number {
    return faceapi.euclideanDistance(
      descriptor1 as Float32Array,
      descriptor2 as Float32Array,
    );
  }

  /**
   * Enroll a new face profile for a user+device combination.
   * Extracts the face descriptor and stores it in PostgreSQL.
   * If a profile already exists, it is updated (re-enrollment).
   */
  async enrollFace(
    userId: string,
    deviceId: string,
    base64Image: string,
  ): Promise<FaceEnrollResult> {
    const descriptor = await this.extractDescriptor(base64Image);

    if (!descriptor) {
      return {
        success: false,
        message:
          'No face detected in the image. Please ensure your face is clearly visible and well-lit.',
        userId,
        enrolledAt: '',
      };
    }

    // Convert Float32Array to regular number array for Prisma storage
    const descriptorArray = Array.from(descriptor);

    // Upsert: create or update the face profile
    const profile = await this.prisma.faceProfile.upsert({
      where: {
        userId_deviceId: { userId, deviceId },
      },
      update: {
        descriptor: descriptorArray,
        referenceImage: base64Image,
      },
      create: {
        userId,
        deviceId,
        descriptor: descriptorArray,
        referenceImage: base64Image,
      },
    });

    this.logger.log(
      `Face enrolled successfully for user ${userId} on device ${deviceId}`,
    );

    return {
      success: true,
      message: 'Face profile enrolled successfully',
      userId,
      enrolledAt: profile.createdAt.toISOString(),
    };
  }

  /**
   * Verify a face against the stored face profile.
   * Returns match result with confidence score.
   */
  async verifyFace(
    userId: string,
    deviceId: string,
    base64Image: string,
  ): Promise<FaceVerifyResult> {
    // Look up the stored face profile
    const profile = await this.prisma.faceProfile.findUnique({
      where: {
        userId_deviceId: { userId, deviceId },
      },
    });

    if (!profile) {
      return {
        match: false,
        confidence: 0,
        distance: 1,
        threshold: this.matchThreshold,
        message:
          'No face profile found for this user. Please enroll your face first.',
      };
    }

    // Extract descriptor from the new image
    const newDescriptor = await this.extractDescriptor(base64Image);

    if (!newDescriptor) {
      return {
        match: false,
        confidence: 0,
        distance: 1,
        threshold: this.matchThreshold,
        message:
          'No face detected in the image. Please ensure your face is clearly visible.',
      };
    }

    // Compare with stored descriptor
    const distance = this.compareDescriptors(
      newDescriptor,
      profile.descriptor,
    );
    const isMatch = distance < this.matchThreshold;
    // Convert distance to a confidence percentage (0-100)
    const confidence = Math.max(
      0,
      Math.round((1 - distance / this.matchThreshold) * 100),
    );

    this.logger.log(
      `Face verification for user ${userId}: distance=${distance.toFixed(4)}, threshold=${this.matchThreshold}, match=${isMatch}`,
    );

    return {
      match: isMatch,
      confidence,
      distance: parseFloat(distance.toFixed(4)),
      threshold: this.matchThreshold,
      message: isMatch
        ? 'Face verified successfully'
        : 'Face does not match the enrolled profile',
    };
  }
}
