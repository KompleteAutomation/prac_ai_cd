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
                bat 'npx playwright test --config=playwright.config.js'
            }
        }
    }

    post {
        always {

            bat '''
            if not exist "%WORKSPACE%\\quality-data" mkdir "%WORKSPACE%\\quality-data"
            if exist "test-results\\playwright-results.json" (
                copy "test-results\\playwright-results.json" "%WORKSPACE%\\quality-data\\run_%BUILD_NUMBER%.json"
            ) else (
                echo Playwright JSON results not found.
            )
            '''

            bat 'node quality-tools\\normalize-playwright\\normalize.js'

            archiveArtifacts artifacts: 'test-results/**', fingerprint: true
            archiveArtifacts artifacts: 'playwright-report/**', fingerprint: true
        }

        failure {
            echo '❌ Test failures detected. Execution data archived for analysis.'
        }

        success {
            echo '✅ Test execution completed successfully.'
        }
    }
}
