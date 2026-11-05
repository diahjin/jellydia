# La Butaca

Lista de peticiones de Jellyfin preparada para GitHub Pages y Supabase.

## Publicación gratuita

1. Crea un proyecto en Supabase.
2. En el SQL Editor de Supabase, abre una consulta, pega el contenido de `supabase-setup.sql` y ejecútala.
3. En Authentication, desactiva los nuevos registros. Desde Authentication > Users, crea manualmente el usuario administrador con tu correo y la contraseña elegida.
4. En Settings > API Keys, copia la URL del proyecto y la Publishable key. Ponlas en `config.js` como `supabaseUrl` y `supabaseAnonKey`. La Publishable key se puede publicar porque las políticas de RLS limitan los permisos; nunca uses una Secret key o service_role en este archivo.
5. Sube los archivos de este proyecto a la raíz de un repositorio de GitHub. No subas archivos `.env` ni claves secretas.
6. En el repositorio, abre Settings > Pages; en Build and deployment elige Deploy from a branch, selecciona `main` y la carpeta `/(root)`, y guarda.
7. Cuando Pages termine la publicación, usa la dirección que aparece en esa pantalla. Envía una petición de prueba y comprueba que el nombre solo aparece tras iniciar sesión como administrador.

El formulario público puede crear solicitudes y consultar la tabla de actualizaciones, que no contiene nombres. Solo los usuarios autenticados pueden leer, cambiar o borrar solicitudes. Mantén desactivados los registros públicos de Supabase para que solo el usuario administrador que creaste pueda iniciar sesión.
