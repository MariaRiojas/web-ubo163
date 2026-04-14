# Setup — CUARTEL-CRM

## Problema conocido
npm tiene un problema de permisos de escritura en el disco G: cuando se ejecuta desde
ciertos procesos. Los archivos de node_modules se crean pero quedan vacíos (0 bytes).

## Solución: ejecutar desde tu terminal de Windows

Abre **PowerShell** o **CMD** como administrador, navega al proyecto y ejecuta:

```powershell
cd "g:\Otros ordenadores\Maria HP\Desktop\PERSONAL\web-ubo163"

# Borrar node_modules corruptos
Remove-Item -Recurse -Force node_modules

# Reinstalar todo
npm install

# Verificar que funciona
node -e "require('drizzle-orm'); console.log('drizzle-orm OK')"
node -e "require('next-auth'); console.log('next-auth OK')"
```

## Una vez instalados correctamente

### 1. Copiar el archivo de entorno
```powershell
Copy-Item .env.example .env
```

### 2. Levantar la base de datos (requiere Docker Desktop)
```powershell
docker compose up -d
```

### 3. Crear las tablas
```powershell
npm run db:push
```

### 4. Cargar datos iniciales
```powershell
npm run db:seed
```

### 5. Iniciar el servidor de desarrollo
```powershell
npm run dev
```

### 6. Acceder al sistema
- **Sitio público:** http://localhost:3000
- **Intranet (login):** http://localhost:3000/login
- **Mailpit (emails):** http://localhost:8025
- **MinIO (storage):** http://localhost:9001
