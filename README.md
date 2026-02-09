This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Verificar conexión con Supabase

Para comprobar que la conexión con Supabase está funcionando correctamente, puedes probar el endpoint de salud:

```bash
# Desde la terminal
curl http://localhost:3000/api/health/supabase

# O abrir en el navegador
http://localhost:3000/api/health/supabase
```

**Respuesta esperada si todo funciona:**
```json
{
  "ok": true,
  "message": "Conexión con Supabase establecida correctamente"
}
```

**Respuesta si hay error:**
```json
{
  "ok": false,
  "error": "Mensaje de error descriptivo"
}
```

> **Nota:** Asegúrate de tener configurado `.env.local` con las variables:
> - `NEXT_PUBLIC_SUPABASE_URL` (requerida)
> - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (recomendada) o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy, mantenida por compatibilidad)
> - `SUPABASE_SERVICE_ROLE_KEY` (requerida para operaciones de administrador)

## Worker de generacion de cuentos

La app encola trabajos en `story_jobs`. En produccion debes invocar
`POST /api/story/worker` con `x-worker-secret: $STORY_WORKER_SECRET`
(o token `Bearer`) desde un cron/webhook periodico.

Los jobs en `processing` se reintentan automaticamente cuando superan
`STORY_JOB_STALE_MS` (por defecto `1800000` ms).

Recomendacion: configura `STORY_JOB_STALE_MS` por encima de
`GENAIPRO_TIMEOUT_MS` para evitar reintentos prematuros cuando
GenAIPro tarda varios minutos en responder.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Credits

This project includes Twemoji assets by Twitter, Inc and contributors, licensed under CC-BY 4.0.

