---
description: Deploy y verificación del juego Mahjong Minecraft
---

// turbo-all

## Pasos

1. Verificar cambios locales:
```bash
cd /Users/jon.llaguno/antigravity/minecraft-mahjong && git status
```

2. Añadir y commitear cambios:
```bash
git add . && git commit -m "Update: mejoras del juego"
```

3. Push a GitHub (despliega automáticamente en Vercel):
```bash
git push
```

4. Verificar el juego en localhost:
```bash
npx -y http-server -p 8080
```
