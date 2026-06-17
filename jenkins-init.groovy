import jenkins.model.*
import hudson.security.*

def instance = Jenkins.getInstance()

if (!instance.isUseSecurity()) {
    // Cria o usuário administrador padrão automaticamente
    def hudsonRealm = new HudsonPrivateSecurityRealm(false)
    hudsonRealm.createAccount("admin", "univates123")
    instance.setSecurityRealm(hudsonRealm)

    // Concede controle total ao usuário criado
    def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
    strategy.setAllowAnonymousRead(false)
    instance.setAuthorizationStrategy(strategy)
    
    instance.save()
}