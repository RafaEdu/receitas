pipeline {
    agent any

    stages {
        stage('Validar Código (Integração)') {
            steps {
                echo 'Garantindo que o container de integração está atualizado...'
                sh 'docker compose build app-integration'
                sh 'docker compose up -d app-integration'
                
                echo 'Rodando testes automatizados (Jest)...'
                // Executa os testes internos do seu projeto dentro do container de Integração
                sh 'docker compose exec -T app-integration npm test'
                
                echo 'Validação concluída com sucesso!'
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
                // O pipeline vai congelar aqui esperando uma ação humana no painel do Jenkins
                input message: 'Valide o ambiente em http://177.44.248.43:3001. Podemos enviar para produção?', ok: 'Promover para Produção'
            }
        }

        stage('Deploy em Produção') {
            steps {
                echo 'Publicando a nova versão em Produção na porta 3000...'
                sh 'docker compose build app-prod'
                sh 'docker compose up -d app-prod'
                echo 'Pipeline finalizado com sucesso!'
            }
        }
    }
}