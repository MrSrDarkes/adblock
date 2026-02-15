# Subir este proyecto a GitHub

Sigue estos pasos:

## 1. Crear el repositorio en GitHub

1. Entra en [github.com](https://github.com) e inicia sesión.
2. Clic en **+** (arriba a la derecha) → **New repository**.
3. **Repository name:** por ejemplo `Adblock` o `adblock-windows`.
4. Elige **Public**.
5. **No** marques "Add a README" (ya tienes uno en el proyecto).
6. Clic en **Create repository**.

## 2. Conectar y subir desde tu PC

Abre **PowerShell** o **Símbolo del sistema** en la carpeta del proyecto y ejecuta (sustituye `TU_USUARIO` y `Adblock` por tu usuario de GitHub y el nombre del repo):

```bash
cd d:\Adblock

git remote add origin https://github.com/TU_USUARIO/Adblock.git
git branch -M main
git push -u origin main
```

Si GitHub te pide autenticación, usa tu usuario y un **Personal Access Token** (no la contraseña) en [Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens).

---

**Resumen:** El repo ya está inicializado y con un commit. Solo falta crear el repositorio en GitHub y ejecutar los tres comandos de arriba con tu URL.
