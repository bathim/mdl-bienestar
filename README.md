# MDL Bienestar — Deploy en Railway

## Pasos para desplegar

### 1. Subir a GitHub
```bash
git init
git add .
git commit -m "MDL Bienestar tracker inicial"
git remote add origin https://github.com/TU_USUARIO/mdl-bienestar.git
git push -u origin main
```

### 2. Crear proyecto en Railway
1. Entra a railway.app → New Project
2. Deploy from GitHub repo → selecciona `mdl-bienestar`
3. Railway detecta Node.js automáticamente

### 3. Agregar base de datos PostgreSQL
1. En tu proyecto Railway → Add Service → Database → PostgreSQL
2. Railway conecta `DATABASE_URL` automáticamente — no necesitas hacer nada más

### 4. Variables de entorno
Railway ya provee `DATABASE_URL` automáticamente.
Solo agrega si quieres:
- `NODE_ENV` = `production`

### 5. Dominio personalizado (opcional)
En Railway → Settings → Domains → Add Custom Domain
Ejemplo: `bienestar.mdlincorp.com`

## Instalar como app en iPhone
1. Abre la URL de tu app en Safari
2. Compartir → Agregar a pantalla de inicio
3. Se instala como app nativa con ícono 🌵

## Estructura del proyecto
```
bienestar-app/
├── server.js          # API Express + servir React
├── package.json       # Dependencias backend
├── railway.toml       # Configuración Railway
└── client/
    ├── package.json   # Dependencias frontend
    ├── public/
    │   ├── index.html
    │   └── manifest.json  # PWA config
    └── src/
        ├── index.js
        └── App.jsx    # Toda la UI del tracker
```

## API endpoints
- `GET  /api/records`         → todos los registros
- `POST /api/records`         → crear o actualizar (upsert por fecha)
- `DELETE /api/records/:fecha` → eliminar registro
