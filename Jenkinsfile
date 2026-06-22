pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Construindo a imagem da aplicação...'
                sh 'docker compose build app-homolog'
            }
        }

        stage('Qualidade de Código (Lint)') {
            steps {
                echo 'Verificando qualidade do código com ESLint...'
                sh 'docker compose run --rm app-homolog npm run lint'
            }
        }

        stage('Testes Automatizados (Jest)') {
            steps {
                echo 'Rodando testes unitários...'
                sh 'docker compose run --rm app-homolog npm test'
            }
        }

        stage('Migrations (Homologação)') {
            steps {
                echo 'Aplicando migrations no banco de homologação...'
                sh 'docker compose up -d db-homolog'
                sh 'docker compose run --rm app-homolog npm run migrate'
            }
        }

        stage('Deploy em Homologação') {
            steps {
                echo 'Atualizando o ambiente de Homologação na porta 3001...'
                sh 'docker compose up -d app-homolog'
            }
        }
    }

    post {
        success {
            echo 'Homologação publicada em http://177.44.248.43:3001'
            echo 'Valide manualmente e rode o job "receitas-deploy-prod" para publicar em produção.'
        }
        failure {
            echo 'Pipeline falhou. Verifique o Console Output acima para identificar o estágio com erro.'
        }
    }
}
