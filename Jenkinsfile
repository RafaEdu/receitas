pipeline {
    agent any

    stages {
        stage('Build & Test (Integração)') {
            steps {
                echo 'Garantindo que o container de integração está atualizado...'
                sh 'docker compose build app-integration'
                sh 'docker compose up -d app-integration'

                echo 'Rodando testes automatizados (Jest)...'
                sh 'docker compose exec -T app-integration npm test'
            }
        }

        stage('Deploy em Homologação') {
            steps {
                echo 'Atualizando o ambiente de Homologação na porta 3001...'
                sh 'docker compose build app-homolog'
                sh 'docker compose up -d app-homolog'
            }
        }
    }

    post {
        success {
            echo 'Homologação publicada em http://177.44.248.43:3001'
            echo 'Para enviar a homologação para PRODUÇÃO, rode manualmente o job "receitas-deploy-prod" (Jenkinsfile.prod).'
        }
    }
}
