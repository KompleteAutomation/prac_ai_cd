pipeline {
    agent any

    environment {
        BASE_URL = "https://aiglobal.space"
        WORKERS = "1"
    }

    options {
        timestamps()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                bat '''
                IF NOT EXIST "%USERPROFILE%\\AppData\\Local\\ms-playwright" (
                    echo Installing Playwright browsers...
                    npx playwright install
                ) ELSE (
                    echo Playwright browsers already installed.
                )
                '''
            }
        }

        stage('Run Playwright Tests') {
            steps {
                // Allow pipeline to continue even if tests fail
                bat 'npx playwright test --config=playwright.config.js || exit 0'
            }
        }

        stage('Store Execution Data') {
            steps {
                bat '''
                if not exist "%WORKSPACE%\\quality-data" mkdir "%WORKSPACE%\\quality-data"
                copy "test-results\\playwright-results.json" "%WORKSPACE%\\quality-data\\run_%BUILD_NUMBER%.json"
                '''
            }
        }

        stage('Normalize Execution Data') {
            steps {
                bat 'node quality-tools\\normalize-playwright\\normalize.js'
            }
        }

        stage('Generate Quality Dashboard') {
            steps {
                bat 'node quality-tools\\dashboard\\generate-dashboard.js'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'test-results/**', fingerprint: true
            archiveArtifacts artifacts: 'playwright-report/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-dashboard/**', fingerprint: true
        }

        failure {
            echo '❌ Test failures detected. Data captured for quality analysis.'
        }

        success {
            echo '✅ Pipeline completed successfully.'
        }
    }
}
