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


        stage('Dependency Vulnerability Scan') {
            steps {
                sh '''
                    set -eu

                    echo "=== DEPENDENCY VULNERABILITY SECURITY GATE ==="

                    SECURITY_CONTAINER="isec6000-security-${BUILD_NUMBER}"

                    cleanup() {
                        docker rm -f "$SECURITY_CONTAINER" >/dev/null 2>&1 || true
                    }

                    trap cleanup EXIT

                    echo
                    echo "Creating isolated Node 16 security scan container..."

                    docker create \
                        --name "$SECURITY_CONTAINER" \
                        -w /workspace \
                        node:16-alpine \
                        sh -c '
                            echo "=== SECURITY SCAN ENVIRONMENT ==="

                            echo "Node version:"
                            node --version

                            echo
                            echo "npm version:"
                            npm --version

                            echo
                            echo "=== INSTALLING LOCKED DEPENDENCIES ==="
                            npm ci

                            echo
                            echo "=== HIGH/CRITICAL DEPENDENCY SECURITY GATE ==="
                            npm audit --audit-level=high
                        '

                    echo
                    echo "Copying checked-out application into security scan container..."
                    docker cp . "$SECURITY_CONTAINER":/workspace

                    echo
                    echo "Starting dependency vulnerability assessment..."
                    docker start -a "$SECURITY_CONTAINER"

                    echo
                    echo "=== SECURITY GATE PASSED ==="
                    echo "No High or Critical dependency vulnerabilities detected."
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


        stage('Publish Image to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "=== DOCKER HUB REGISTRY PUBLICATION ==="

                        LOCAL_IMAGE="isec6000-express:build-${BUILD_NUMBER}"
                        REGISTRY_REPOSITORY="${DOCKERHUB_USERNAME}/isec6000-express"
                        VERSIONED_IMAGE="${REGISTRY_REPOSITORY}:build-${BUILD_NUMBER}"
                        LATEST_IMAGE="${REGISTRY_REPOSITORY}:latest"

                        DOCKER_CONFIG_DIR="$(mktemp -d)"
                        export DOCKER_CONFIG="$DOCKER_CONFIG_DIR"

                        cleanup() {
                            docker logout >/dev/null 2>&1 || true
                            rm -rf "$DOCKER_CONFIG_DIR"
                        }

                        trap cleanup EXIT

                        echo
                        echo "Local Jenkins artifact:"
                        echo "$LOCAL_IMAGE"

                        echo
                        echo "Versioned registry artifact:"
                        echo "$VERSIONED_IMAGE"

                        echo
                        echo "Latest registry artifact:"
                        echo "$LATEST_IMAGE"

                        echo
                        echo "=== AUTHENTICATING TO DOCKER HUB ==="

                        printf '%s' "$DOCKERHUB_TOKEN" | \
                            docker login \
                                --username "$DOCKERHUB_USERNAME" \
                                --password-stdin

                        echo
                        echo "=== TAGGING REGISTRY IMAGES ==="

                        docker tag "$LOCAL_IMAGE" "$VERSIONED_IMAGE"
                        docker tag "$LOCAL_IMAGE" "$LATEST_IMAGE"

                        docker image inspect "$VERSIONED_IMAGE" \
                            --format 'VersionedImage={{.RepoTags}} | Commit={{index .Config.Labels "isec6000.commit"}} | JenkinsBuild={{index .Config.Labels "isec6000.build"}}'

                        echo
                        echo "=== PUSHING VERSIONED IMAGE ==="

                        docker push "$VERSIONED_IMAGE"

                        echo
                        echo "=== PUSHING LATEST IMAGE ==="

                        docker push "$LATEST_IMAGE"

                        echo
                        echo "=== DOCKER HUB PUBLICATION COMPLETE ==="

                        echo "Published: $VERSIONED_IMAGE"
                        echo "Published: $LATEST_IMAGE"
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
