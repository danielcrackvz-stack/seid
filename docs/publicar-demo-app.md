# Publicar la demo del panel en GitHub Pages

La PC no estaba conectada cuando se terminó la demo. El código está en el box
(`/workspace/seid/app/demo`) y empaquetado en `/workspace/seid/seid-app-demo.tar.gz`.

Cuando la PC vuelva a estar en línea (Grok Bot desktop app abierta):

1. Copiar y extraer el archivo en `C:\Users\Hp\Proyectos\SEID` (queda `app\demo\` y se actualiza `README.md`).
2. En esa carpeta, **no perder** el commit local de `main` que todavía no se pudo subir (tiene `.github/workflows/pages.yml`).
3. Hacer un commit nuevo en `main` con `app/demo` y el README. Quitar `app/.gitkeep` si existe.
4. **No** intentar `git push origin main` si vuelve a fallar por el alcance `workflow` del token.
5. Publicar en la rama `gh-pages` (la landing actual vive en la raíz y debe quedar intacta):

```powershell
cd C:\Users\Hp\Proyectos\SEID
git fetch origin gh-pages
if (-not (Test-Path C:\Users\Hp\Proyectos\seid-gh-pages)) {
  git worktree add C:\Users\Hp\Proyectos\seid-gh-pages gh-pages
}
# Copiar el contenido de app/demo hacia app/ (no app/demo) en gh-pages
New-Item -ItemType Directory -Force -Path C:\Users\Hp\Proyectos\seid-gh-pages\app | Out-Null
Copy-Item -Recurse -Force C:\Users\Hp\Proyectos\SEID\app\demo\* C:\Users\Hp\Proyectos\seid-gh-pages\app\
# No tocar los archivos de la landing en la raíz
Set-Location C:\Users\Hp\Proyectos\seid-gh-pages
git add app
git status
git commit -m "Publica la demo del panel admin en /app/"
git push origin gh-pages
```

6. La demo queda en: https://danielcrackvz-stack.github.io/seid/app/

No modificar la landing ni agregar un enlace de acceso admin.
