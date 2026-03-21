# Guia de Configuração do Git

Como o comando `git` não foi reconhecido no seu sistema, você precisa instalá-lo primeiro.

## Passo 1: Instalar o Git

1.  Baixe o instalador oficial para Windows: [https://git-scm.com/download/win](https://git-scm.com/download/win).
2.  Execute o instalador (`Git-2.xx.x-64-bit.exe`).
3.  Vá clicando em **Next** (pode deixar todas as opções padrão).
4.  No final, clique em **Finish**.
5.  **Importante**: Feche e abra novamente este terminal (ou o VS Code) para que o coamndo `git` seja reconhecido.

## Passo 2: Configurar seu Usuário (Uma vez)

Rode estes comandos no terminal substituindo pelos seus dados:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

## Passo 3: Publicar o Projeto ("Commit")

Agora vamos salvar o projeto atual no Git localmente:

```bash
# Iniciar o repositório (se ainda não fez)
git init

# Adicionar todos os arquivos
git add .

# Salvar a versão (Commit)
git commit -m "Primeira versão do projeto Bilula"
```

## Passo 4: Enviar para o GitHub (Opcional)

Se você quiser colocar no site GitHub:
1.  Crie um repositório vazio no site do GitHub (sem README, sem .gitignore).
2.  Copie o link do repositório (ex: `https://github.com/seu-usuario/bilula.git`).
3.  Rode no terminal:

```bash
git branch -M main
git remote add origin SEU_LINK_DO_GITHUB_AQUI
git push -u origin main
```
