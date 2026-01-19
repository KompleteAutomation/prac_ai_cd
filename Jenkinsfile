pipeline {
    agent any

    environment {
        BASE_URL = 'https://aiglobal.space'
        WORKERS = '1'
        OPENAI_API_KEY = credentials('OPENAI_API_KEY')
        SETUP_MODE = 'api'
    }

    options { timestamps() }

    stages {

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install Dependencies') {
            steps { bat 'npm ci' }
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
                script {
                    try {
                        bat 'npx playwright test --config=playwright.config.js --workers=%WORKERS% --project=chromium $(type quality-ml-results\\prioritized-tests.txt)'
'
                    }
                    catch (err) {
                        echo '❌ Playwright tests failed — marking build UNSTABLE but continuing'
                        currentBuild.result = 'UNSTABLE'
                    }
                }
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

        stage('Normalize Execution Data') {
            steps { bat 'node quality-tools\\normalize-playwright\\normalize.js' }
        }

        stage('Generate Run Metrics Table') {
            steps { bat 'node quality-tools\\presentation\\generate-run-metrics-table.js' }
        }

        stage('Generate Quality Dashboard') {
            steps { bat 'node quality-tools\\dashboard\\generate-dashboard.js' }
        }

        stage('Build Failure Clusters') {
            steps { bat 'node quality-tools\\clustering\\build-failure-clusters.js' }
        }

        stage('Generate RCA Summaries') {
            steps { bat 'node quality-tools\\rca\\generate-rca.js' }
        }

        stage('Generate Executive Summary') {
            steps { bat 'node quality-tools\\presentation\\generate-executive-summary.js' }
        }

        stage('Generate RCA Dashboard') {
            steps { bat 'node quality-tools\\presentation\\generate-rca-dashboard.js' }
        }

        stage('Generate Trends & ROI Dashboard') {
            steps { bat 'node quality-tools\\presentation\\generate-trends-roi.js' }
        }

        stage('Build ML Feature Dataset') {
            steps { bat 'node quality-tools\\prioritization\\build-test-feature-dataset.js' }
        }

        stage('Generate Test Priority Scores') {
            steps { bat 'node quality-tools\\prioritization\\score-tests.js' }
        }

        stage('Generate Priority Summary') {
            steps { bat 'node quality-tools\\prioritization\\generate-priority-summary.js' }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'test-results/**', fingerprint: true
            archiveArtifacts artifacts: 'playwright-report/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-data/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-data-normalized/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-dashboard/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-data-clusters/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-data-rca/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-presentation/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-ml-dataset/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-ml-results/**', fingerprint: true
            archiveArtifacts artifacts: 'quality-presentation/test-priority-summary.html', fingerprint: true
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
