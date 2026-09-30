pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                    echo "=== SOURCE CONTROL CHECK ==="
                    echo "Current commit:"
                    git rev-parse --short HEAD

                    echo
                    echo "Working tree:"
                    git status --short

                    echo
                    echo "Repository:"
                    git remote -v
                '''
            }
        }

        stage('Verify Build Environment') {
            steps {
                sh '''
                    echo "=== BUILD ENVIRONMENT CHECK ==="

                    echo
                    echo "Git version:"
                    git --version

                    echo
                    echo "Docker CLI version:"
                    docker --version

                    echo
                    echo "Docker daemon connection:"
                    docker version
                '''
            }
        }

        stage('Automated Tests') {
            steps {
                sh '''
                    set -eu

                    echo "=== NODE 16 AUTOMATED TEST STAGE ==="

                    TEST_CONTAINER="isec6000-node-test-${BUILD_NUMBER}"

                    cleanup() {
                        docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
                    }

                    trap cleanup EXIT

                    echo
                    echo "Pulling Node 16 Alpine image..."
                    docker pull node:16-alpine

                    echo
                    echo "Creating isolated Node.js test container..."
                    docker create \
                        --name "$TEST_CONTAINER" \
                        -w /workspace \
                        node:16-alpine \
                        sh -c '
                            echo "Node version:"
                            node --version

                            echo
                            echo "npm version:"
                            npm --version

                            echo
                            echo "Installing dependencies using npm ci..."
                            npm ci

                            echo
                            echo "Running automated tests..."
                            npm test
                        '

                    echo
                    echo "Copying checked-out application into test container..."
                    docker cp . "$TEST_CONTAINER":/workspace

                    echo
                    echo "Starting automated test execution..."
                    docker start -a "$TEST_CONTAINER"
                '''
            }
        }
    }

    post {
        success {
            echo 'Jenkins CI checkout, environment verification and automated tests completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Review the stage logs to identify the problem.'
        }
    }
}
