pipeline {
    agent any

    environment {
        BASE_URL = 'https://aiglobal.space'
        WORKERS = '1'
        OPENAI_API_KEY = credentials('OPENAI_API_KEY')
        SETUP_MODE = 'api'
    

    options {
        timestamps()
    }

    stages {
        // ---------------------------
        // 1. Checkout Source
        // ---------------------------
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ---------------------------
        // 2. Install Node Dependencies
        // ---------------------------
        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        // ---------------------------
        // 3. Install Playwright Browsers (cached)
        // ---------------------------
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

        // ---------------------------
        // 4. Execute Playwright Tests
        // ---------------------------
        stage('Run Playwright Tests') {
            steps {
                script {
                    try {
                        bat 'npx playwright test --config=playwright.config.js'
                    }
                    catch (err) {
                        echo '❌ Playwright tests failed — marking build UNSTABLE but continuing for reporting'
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        // ---------------------------
        // 5. Store Current Run JSON
        // ---------------------------
        stage('Store Execution Data') {
            steps {
                bat '''
                if not exist "%WORKSPACE%\\quality-data" mkdir "%WORKSPACE%\\quality-data"
                copy "test-results\\playwright-results.json" "%WORKSPACE%\\quality-data\\run_%BUILD_NUMBER%.json"
                '''
            }
        }

        // ---------------------------
        // 6. Load Historical Runs from Jenkins Archives
        // ---------------------------
        stage('Load Historical Execution Data') {
            steps {
                bat '''
        echo Loading historical execution data...
        if not exist "%WORKSPACE%\\quality-data" mkdir "%WORKSPACE%\\quality-data"

        for /f %%G in ('dir /b /ad "C:\\Users\\DELL\\.jenkins\\jobs\\prac_qa_cd\\builds"') do (
            if exist "C:\\Users\\DELL\\.jenkins\\jobs\\prac_qa_cd\\builds\\%%G\\archive\\quality-data\\run_*.json" (
                copy "C:\\Users\\DELL\\.jenkins\\jobs\\prac_qa_cd\\builds\\%%G\\archive\\quality-data\\run_*.json" "%WORKSPACE%\\quality-data\\" >nul
            )
        )
        '''
            }
        }

        // ---------------------------
        // 7. Normalize ALL Runs into CSV
        // ---------------------------
        stage('Normalize Execution Data') {
            steps {
                bat 'node quality-tools\\normalize-playwright\\normalize.js'
            }
        }

        // ---------------------------
        // 8. Generate Trusted Metrics Table (CSV)
        // ---------------------------
        stage('Generate Run Metrics Table') {
            steps {
                bat 'node quality-tools\\presentation\\generate-run-metrics-table.js'
            }
        }

        // ---------------------------
        // 9. Generate Quality Dashboard (Legacy View)
        // ---------------------------
        stage('Generate Quality Dashboard') {
            steps {
                bat 'node quality-tools\\dashboard\\generate-dashboard.js'
            }
        }

        // ---------------------------
        // 10. Build Failure Clusters
        // ---------------------------
        stage('Build Failure Clusters') {
            steps {
                bat 'node quality-tools\\clustering\\build-failure-clusters.js'
            }
        }

        // ---------------------------
        // 11. Generate RCA Summaries (AI)
        // ---------------------------
        stage('Generate RCA Summaries') {
            steps {
                bat 'node quality-tools\\rca\\generate-rca.js'
            }
        }

        // ---------------------------
        // 12. Executive Summary View
        // ---------------------------
        stage('Generate Executive Summary') {
            steps {
                bat 'node quality-tools\\presentation\\generate-executive-summary.js'
            }
        }

        // ---------------------------
        // 13. Engineering RCA Dashboard
        // ---------------------------
        stage('Generate RCA Dashboard') {
            steps {
                bat 'node quality-tools\\presentation\\generate-rca-dashboard.js'
            }
        }

        // ---------------------------
        // 14. Trends & ROI Dashboard
        // ---------------------------
        stage('Generate Trends & ROI Dashboard') {
            steps {
                bat 'node quality-tools\\presentation\\generate-trends-roi.js'
            }
        }

        // ---------------------------
        // 15. Generate Dashboard
        // ---------------------------
        stage('Generate Dashboard') {
            steps {
                bat 'node quality-tools\\dashboard\\generate-dashboard.js'
            }
        }
    }

    // ---------------------------
    // 16. Archive Everything for History
    // ---------------------------
    post {
        always {
            archiveArtifacts artifacts: 'test-results/**', fingerprint: true
            archiveArtifacts artifacts: 'playwright-report/**', fingerprint: true

            // Raw run JSON history
            archiveArtifacts artifacts: 'quality-data/**', fingerprint: true

            // Normalized CSV history
            archiveArtifacts artifacts: 'quality-data-normalized/**', fingerprint: true

            // Dashboards & presentations
            archiveArtifacts artifacts: 'quality-dashboard/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-data-clusters/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-data-rca/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-presentation/**', fingerprint: true
        }

        success {
            echo '✅ Pipeline completed successfully.'
        }

        unstable {
            echo '🟠 Tests failed — Build marked UNSTABLE. Reports & RCA generated successfully.'
        }

        failure {
            echo '🔴 Pipeline infrastructure failure.'
        }
    }
}
