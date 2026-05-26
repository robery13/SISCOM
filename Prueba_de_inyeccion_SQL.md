# Prueba De Inyeccion SQL (Guia Profesional Para Auditoria Autorizada)

> **Importante:** Esta guia es para evaluacion de seguridad con autorizacion formal (tu sistema, laboratorio o contrato de pentest).  
> No incluye pasos de explotacion ofensiva ni extraccion de datos.

## 1) Objetivo Del Documento

Este archivo te sirve como playbook para una evaluacion tipo "remota" de riesgo SQL Injection:

- definir alcance y reglas del test;
- ejecutar validaciones tecnicas seguras;
- registrar evidencia util para informe;
- cerrar con mitigaciones verificables.

## 2) Pre-Requisitos De Auditoria

Antes de probar, deja por escrito:

- `Alcance`: dominios, subdominios, endpoints y ambientes (`dev`, `staging`, `prod`).
- `Ventana`: fecha/hora autorizada para pruebas.
- `Contacto`: persona tecnica y escalamiento.
- `Limitaciones`: sin DoS, sin fuerza bruta, sin exfiltracion de datos.
- `Criterio de exito`: confirmar si hay o no riesgo SQLi en cada endpoint critico.

Plantilla corta:

```text
Proyecto:
Cliente/Equipo:
Fecha:
Alcance autorizado:
Exclusiones:
Responsable tecnico:
Canal de emergencia:
```

## 3) Preparacion De Variables (PowerShell)

```powershell
$BASE = "https://objetivo-ejemplo.com"
$LOGIN = "$BASE/login.php"
$SEARCH = "$BASE/busqueda.php"
$COOKIE = "PHPSESSID=TU_SESION"
$OUT = ".\evidencia_sqli"
New-Item -ItemType Directory -Force -Path $OUT | Out-Null
```

## 4) Metodologia Recomendada (OWASP-Style)

## 4.1 Descubrimiento

- Identifica entradas: query params, formularios POST, cabeceras, cookies.
- Prioriza funcionalidades criticas: login, recuperacion de cuenta, busqueda, filtros, reportes.
- Mapea tecnologia visible: tipo de servidor, framework, mensajes de error.

Comandos de apoyo:

```powershell
curl.exe -I "$BASE" | Tee-Object "$OUT\01_headers.txt"
curl.exe -s "$LOGIN" | Tee-Object "$OUT\02_login_response.html"
```

## 4.2 Establecer Baseline (sin pruebas agresivas)

La idea es tener una respuesta "normal" para comparar:

```powershell
$normal = curl.exe -s -o NUL -w "code=%{http_code};time=%{time_total};size=%{size_download}" `
  -X POST "$LOGIN" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  --data "usuario=usuario_demo&password=clave_demo"
$normal | Tee-Object "$OUT\03_baseline_login.txt"
```

## 4.3 Pruebas De Robustez De Entrada (seguras)

Evalua manejo de caracteres especiales y validacion, sin intentar bypass:

```powershell
$tests = @(
  "usuario=test&password=test",
  "usuario=test'&password=test",
  "usuario=test%22&password=test",
  "usuario=test%5C&password=test",
  "usuario=&password="
)

$i = 1
foreach ($t in $tests) {
  $r = curl.exe -s -o NUL -w "code=%{http_code};time=%{time_total};size=%{size_download}" `
    -X POST "$LOGIN" `
    -H "Content-Type: application/x-www-form-urlencoded" `
    --data "$t"
  "$i`t$t`t$r" | Tee-Object -Append "$OUT\04_input_robustness.tsv"
  $i++
}
```

Criterios de alerta:

- errores SQL visibles en respuesta;
- variaciones anormales grandes de tiempo o tamano sin motivo funcional;
- respuestas 500 repetibles con entradas especiales;
- comportamiento inconsistente entre endpoints similares.

## 4.4 Verificacion En Endpoints GET

```powershell
curl.exe -s "$SEARCH?q=laptop" | Tee-Object "$OUT\05_search_normal.html"
curl.exe -s "$SEARCH?q=laptop%27" | Tee-Object "$OUT\06_search_quote.html"
```

Revisa diferencias de:

- codigo HTTP;
- contenido de error;
- estructura HTML;
- mensajes del backend.

## 4.5 Pruebas Autenticadas (si aplica)

Si tienes sesion valida de auditor:

```powershell
curl.exe -s "$BASE/panel.php" -H "Cookie: $COOKIE" | Tee-Object "$OUT\07_panel_auth.html"
curl.exe -s "$BASE/reporte.php?id=123" -H "Cookie: $COOKIE" | Tee-Object "$OUT\08_report_auth.html"
```

## 5) Registro De Evidencia (Checklist)

- Fecha/hora exacta (timezone incluida).
- Endpoint y metodo (`GET/POST`).
- Parametro probado.
- Entrada enviada (sanitizada en informe).
- Resultado: codigo, tamano, tiempo, mensaje.
- Captura/log adjunto.
- Reproducibilidad (si/no y pasos).

Formato sugerido:

```text
[ID] SQLI-LOGIN-001
Endpoint: /login.php
Metodo: POST
Parametro: usuario
Prueba: caracter especial simple
Resultado: HTTP 500 + mensaje de error SQL visible
Evidencia: 04_input_robustness.tsv, captura_001.png
Riesgo preliminar: Alto
```

## 6) Clasificacion De Riesgo

Usa una escala simple y consistente:

- `Alto`: confirma consulta vulnerable en autenticacion o datos sensibles.
- `Medio`: errores SQL o comportamiento anomalo reproducible sin confirmacion total.
- `Bajo`: mala practica sin impacto demostrable inmediato.
- `Informativo`: hardening recomendado, sin evidencia de falla explotable.

## 7) Mitigacion Tecnica Inmediata

## 7.1 PHP Con PDO (Recomendado)

```php
<?php
$pdo = new PDO($dsn, $dbUser, $dbPass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$stmt = $pdo->prepare("SELECT id, usuario FROM usuarios WHERE usuario = :u AND password_hash = :p");
$stmt->execute([
    ':u' => $usuario,
    ':p' => $passwordHash
]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
```

## 7.2 PHP Con MySQLi

```php
<?php
$stmt = $conn->prepare("SELECT id FROM usuarios WHERE usuario = ? AND password_hash = ?");
$stmt->bind_param("ss", $usuario, $passwordHash);
$stmt->execute();
$result = $stmt->get_result();
```

Controles complementarios:

- validacion de tipo/longitud por parametro;
- mensajes de error genericos de cara al usuario;
- logs internos detallados solo para administradores;
- cuenta de BD con privilegios minimos;
- rotacion de credenciales y monitoreo.

## 8) Re-Test (Cierre De Hallazgo)

Despues del fix:

- repite mismas pruebas del hallazgo;
- confirma que no hay error SQL visible;
- verifica que funcionalidad legitima sigue operando;
- documenta evidencia de "antes/despues".

## 9) Estructura De Informe Final

```text
1. Resumen ejecutivo
2. Alcance y metodologia
3. Hallazgos por severidad
4. Evidencias tecnicas
5. Recomendaciones priorizadas
6. Plan de remediacion (owner + fecha)
7. Resultado de re-test
```

## 10) Buenas Practicas Operativas

- ejecuta pruebas primero en `staging`;
- evita pruebas en horas pico de produccion;
- comunica inicio/cierre de ventana de test;
- conserva trazabilidad de cada comando ejecutado;
- nunca pruebes fuera del alcance autorizado.
