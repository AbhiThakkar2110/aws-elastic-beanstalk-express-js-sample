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

        stage('Build Application Image') {
            steps {
                sh '''
                    set -eu

                    echo "=== APPLICATION IMAGE BUILD STAGE ==="

                    IMAGE_NAME="isec6000-express"
                    IMAGE_TAG="build-${BUILD_NUMBER}"
                    FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

                    echo
                    echo "Building production application image:"
                    echo "$FULL_IMAGE"

                    docker build \
                        --label "isec6000.commit=$(git rev-parse HEAD)" \
                        --label "isec6000.build=${BUILD_NUMBER}" \
                        -t "$FULL_IMAGE" \
                        .

                    echo
                    echo "=== BUILT IMAGE ==="
                    docker image ls "$FULL_IMAGE"

                    echo
                    echo "=== IMAGE CONFIGURATION ==="
                    docker image inspect "$FULL_IMAGE" \
                        --format 'Image={{.RepoTags}} | User={{.Config.User}} | WorkingDir={{.Config.WorkingDir}} | ExposedPorts={{json .Config.ExposedPorts}} | Cmd={{json .Config.Cmd}}'

                    echo
                    echo "=== IMAGE LABELS ==="
                    docker image inspect "$FULL_IMAGE" \
                        --format 'Commit={{index .Config.Labels "isec6000.commit"}} | JenkinsBuild={{index .Config.Labels "isec6000.build"}}'
                '''
            }
        }
    }

    post {
        success {
            echo 'Jenkins CI checkout, automated tests and production image build completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Review the stage logs to identify the problem.'
        }
    }
}
