pipeline {
    agent any

    stages {
        stage('Validar Código (Integração)') {
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

        stage('Aprovação do Usuário') {
            steps {
                input message: 'Valide o ambiente em http://177.44.248.43:3001. Enviar para produção?', ok: 'Aprovar'
            }
        }

        stage('Deploy em Produção') {
            steps {
                echo 'Publicando em Produção na porta 3000...'
                sh 'docker compose build app-prod'
                sh 'docker compose up -d app-prod'
            }
        }
    }
}