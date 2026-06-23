import jenkins.model.*
import hudson.security.*
import hudson.model.*
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import hudson.plugins.git.GitSCM
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.UserRemoteConfig

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

// --- CONFIGURAÇÃO AUTOMÁTICA DAS PIPELINES DE RECEITAS ---

def repoUrl = "https://github.com/RafaEdu/receitas.git"
def branchName = "*/main"

// 1. Criar Pipeline receitas-homolog
def jobHomologName = "receitas-homolog"
if (instance.getItem(jobHomologName) == null) {
    def job = instance.createProject(WorkflowJob.class, jobHomologName)
    
    def remoteConfig = new UserRemoteConfig(repoUrl, null, null, null)
    def branchSpec = new BranchSpec(branchName)
    def scm = new GitSCM([remoteConfig], [branchSpec], false, [], null, null, [])
    
    def definition = new CpsScmFlowDefinition(scm, "Jenkinsfile")
    definition.setLightweight(true)
    job.setDefinition(definition)
    
    job.save()
    println "--> Job '${jobHomologName}' criado com sucesso a partir do SCM."
}

// 2. Criar Pipeline receitas-prod
def jobProdName = "receitas-prod"
if (instance.getItem(jobProdName) == null) {
    def job = instance.createProject(WorkflowJob.class, jobProdName)
    
    def remoteConfig = new UserRemoteConfig(repoUrl, null, null, null)
    def branchSpec = new BranchSpec(branchName)
    def scm = new GitSCM([remoteConfig], [branchSpec], false, [], null, null, [])
    
    def definition = new CpsScmFlowDefinition(scm, "Jenkinsfile.prod")
    definition.setLightweight(true)
    job.setDefinition(definition)
    
    job.save()
    println "--> Job '${jobProdName}' criado com sucesso a partir do SCM."
}