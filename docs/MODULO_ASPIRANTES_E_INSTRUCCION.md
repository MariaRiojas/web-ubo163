# Especificación Funcional: Módulo de Instrucción y Admisión (Aspirantes)

**Proyecto:** CUARTEL-ERP — Compañía de Bomberos 163
**Objetivo Legal:** Destruir la "caja negra" del proceso de asimilación e incorporación. Prevenir y auditar denuncias por abuso de autoridad, favoritismo o falta de imparcialidad mediante métricas inmutables y trazabilidad absoluta.

---

## 1. Visión General del Problema a Resolver
Actualmente, los postulantes y aspirantes perciben el proceso de evaluación como subjetivo. Sus horas de apoyo, su rendimiento físico y académico dependen de cuadernos informales o de la memoria y voluntad del Instructor a cargo. Esto genera un ambiente propenso a reclamos y desmotivación.

El ERP solucionará esto convirtiendo al postulante en un usuario con acceso limitado al sistema, donde él mismo podrá auditar su progreso.

## 2. El "Dashboard del Postulante/Aspirante"
Cada postulante/aspirante tendrá su propio usuario (con rol restringido). Al entrar, verá:
*   **Barra de Progreso de Incorporación:** Muestra exactamente en qué fase de la NDR de Incorporación se encuentra (Ej: Fase de Selección -> Evaluación Psicológica Pendiente).
*   **Métricas de Aptitud (El Triángulo de Evaluación):**
    1.  **Física:** Récord de sus exámenes físicos (tiempos, repeticiones) ingresados por el Instructor.
    2.  **Académica:** Notas de sus exámenes de conocimientos generales o módulos ESBAS.
    3.  **Bomberil (Horas de Servicio/Apoyo):** Sus horas acumuladas en el cuartel.

## 3. Trazabilidad de la "Aptitud Bomberil" (El Cuaderno Digital)
Se elimina el cuaderno informal. Se reemplaza por el **Control de Apoyo**:
*   **Registro de Entrada/Salida:** El aspirante marca su ingreso desde una tablet/PC del cuartel.
*   **Bitácora de Actividades:** Al salir, el aspirante registra qué hizo ("Apoyo en limpieza de M163-1", "Acondicionamiento de paños").
*   **Validación Cruzada (Antifraude):** El registro queda en estado *Pendiente*. El Efectivo al Mando o el Jefe de Instrucción debe entrar a su sesión y darle "Aprobar". Si no se aprueba en 48 horas, el sistema alerta al Comandante.
*   **Transparencia:** El aspirante ve exactamente cuántas horas validadas tiene a su favor. Nadie puede "borrarle" horas de apoyo.

## 4. Auditoría de Exámenes e Imparcialidad
Para evitar la alteración de notas o evaluaciones subjetivas:
*   **Exámenes Académicos Auto-calificados:** Los exámenes teóricos se rinden dentro del ERP. El sistema califica (Nota inmutable) y muestra en qué falló.
*   **Exámenes Físicos:** El Instructor ingresa los tiempos (ej. 12 min Test de Cooper). El sistema calcula automáticamente el puntaje según las tablas oficiales (Anexo 3 NDR Ascensos/Incorporación). El instructor no pone la nota, solo el dato crudo; el sistema emite el resultado.
*   **Junta Calificadora:** Cualquier decisión de "No Apto" en la entrevista debe estar sustentada en un formulario digital obligatorio dentro del ERP. Si un postulante es dado de baja del proceso, el sistema envía un correo al Primer Jefe con la causal exacta de la NDR.

## 5. Workflow de Licencias y Permisos para Aspirantes
El flujo de solicitudes queda formalizado y auditable:
1.  **Solicitud:** El aspirante entra a su perfil y solicita "Permiso por estudios" adjuntando su horario universitario.
2.  **Filtro Nivel 1:** La alerta llega al **Jefe de Instrucción**, quien revisa y añade un comentario ("Procede, tiene buen rendimiento").
3.  **Aprobación Nivel 2:** Pasa a la bandeja del **Primer Jefe** (Comandante), quien tiene la decisión final ("Aprobado" o "Rechazado").
4.  **Notificación:** El aspirante recibe la respuesta oficial en el sistema. Se elimina la respuesta verbal que luego se puede desconocer.

## 6. Manejo de Denuncias (Canal Ético)
Siendo la base del CGBVP el honor y la disciplina (RIF Art. 16), el sistema tendrá un botón de **"Reporte Confidencial"**.
*   Si un postulante o aspirante sufre acoso o abuso de poder por parte de un instructor o efectivo, puede emitir un reporte.
*   **Destino:** Este reporte va cifrado y llega **única y directamente al Consejo Disciplinario / Jefatura Máxima**, saltándose a los instructores o personal de línea, garantizando su protección.
