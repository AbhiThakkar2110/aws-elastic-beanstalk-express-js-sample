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
    }

    post {
        success {
            echo 'Initial Jenkins CI environment verification completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Review the stage logs to identify the problem.'
        }
    }
}
