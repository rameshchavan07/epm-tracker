package com.epm.tracking.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.epm.tracking.data.SessionManager
import com.epm.tracking.ui.DashboardScreen
import com.epm.tracking.ui.LoginScreen

import com.epm.tracking.ui.screens.FaceEnrollmentScreen

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }

    val startDestination = when {
        sessionManager.getAuthToken() == null -> "login"
        !sessionManager.isFaceEnrolled() -> "enrollment"
        else -> "dashboard"
    }

    NavHost(navController = navController, startDestination = startDestination) {
        composable("login") {
            LoginScreen(
                sessionManager = sessionManager,
                onLoginSuccess = {
                    val nextRoute = if (sessionManager.isFaceEnrolled()) "dashboard" else "enrollment"
                    navController.navigate(nextRoute) {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }
        composable("enrollment") {
            FaceEnrollmentScreen(
                sessionManager = sessionManager,
                onEnrollmentComplete = {
                    navController.navigate("dashboard") {
                        popUpTo("enrollment") { inclusive = true }
                    }
                }
            )
        }
        composable("dashboard") {
            DashboardScreen(
                onLogout = {
                    sessionManager.clearSession()
                    navController.navigate("login") {
                        popUpTo("dashboard") { inclusive = true }
                    }
                }
            )
        }
    }
}
