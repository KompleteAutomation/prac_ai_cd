pipeline {
    agent any

    environment {
        BASE_URL = "https://aiglobal.space"
        WORKERS = "2"
    
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
                bat 'npx playwright install'
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
            archiveArtifacts artifacts: 'test-results/**', fingerprint: true
            archiveArtifacts artifacts: 'playwright-report/**', fingerprint: true
        }
        failure {
            echo '❌ Test failures detected. JSON results archived for analysis.'
        }
        success {
            echo '✅ Test execution completed successfully.'
        }
    }
}
