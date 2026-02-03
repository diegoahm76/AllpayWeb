/* utils/downloadOrOpen.ts ------------------------------------------- */
export const downloadOrOpen = async (
    url: string,
    fileName: string,
    token?: string        // solo necesario cuando el recurso es same-origin
  ) => {
    // Intentamos primero descargar con fetch + blob
    try {
      const sameOrigin =
        new URL(url, window.location.origin).origin === window.location.origin;
  
      const res = await fetch(url, {
        // Si no es same-origin, NO enviamos headers extra (evitamos pre-flight)
        headers: sameOrigin && token ? { Authorization: `Bearer ${token}` } : {}
      });
  
      // Si la petición falla (CORS, 4xx, 5xx), fetch lanza o res.ok === false
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Fallo la descarga directa, usando fallback:', err);
      // Fallback: abrir el PDF en pestaña nueva
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  