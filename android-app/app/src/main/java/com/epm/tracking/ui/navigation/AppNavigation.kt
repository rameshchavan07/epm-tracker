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

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }
    
    val startDestination = if (sessionManager.getAuthToken() != null) "dashboard" else "login"

    NavHost(navController = navController, startDestination = startDestination) {
        composable("login") {
            LoginScreen(
                sessionManager = sessionManager,
                onLoginSuccess = {
                    navController.navigate("dashboard") {
                        popUpTo("login") { inclusive = true }
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
