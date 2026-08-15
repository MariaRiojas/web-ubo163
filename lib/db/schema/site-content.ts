/**
 * Contenido editable del landing público.
 *
 * Tabla `{PREFIX}-site-content` — PK: contentKey (ej. 'admision.hero.subtitle').
 * Cada ítem guarda el HTML editado por el área de Imagen. El landing lo renderiza
 * con fallback al texto por defecto del registro, así nada se rompe si aún no se editó.
 */
export interface SiteContentBlock {
  contentKey: string   // PK
  html: string
  updatedBy?: string
  updatedByName?: string
  updatedAt: string
}

export type BlockKind = 'text' | 'rich'

export interface EditableBlock {
  key: string
  label: string
  page: string          // agrupador para la UI del editor
  kind: BlockKind       // 'text' = una línea; 'rich' = editor Tiptap
  defaultHtml: string   // fallback mientras no exista valor guardado
  hint?: string
}

/**
 * Registro de bloques editables. Cada `key` debe corresponder a un `<SiteText>`
 * colocado en el landing. Ampliar aquí para exponer más bloques al editor.
 */
export const EDITABLE_BLOCKS: EditableBlock[] = [
  // ── Inicio ──────────────────────────────────────────────────────────────
  {
    key: 'inicio.hero.tagline', page: 'Inicio', label: 'Hero · lema principal', kind: 'rich',
    defaultHtml: 'Protegiendo vidas y propiedades las 24 horas del día. Voluntarios al servicio de nuestra comunidad.',
  },
  {
    key: 'inicio.mision.overline', page: 'Inicio', label: 'Misión · etiqueta', kind: 'text',
    defaultHtml: 'Nuestra misión',
  },
  {
    key: 'inicio.mision.title', page: 'Inicio', label: 'Misión · título', kind: 'rich',
    defaultHtml: 'Al servicio de Ancón',
  },
  {
    key: 'inicio.mision.intro', page: 'Inicio', label: 'Misión · párrafo', kind: 'rich',
    defaultHtml: 'Respondemos a incendios, emergencias médicas, rescates y desastres naturales. Somos voluntarios comprometidos con la seguridad de nuestra comunidad.',
  },
  { key: 'inicio.serv.1.title', page: 'Inicio', label: 'Servicio 1 · título', kind: 'text', defaultHtml: 'Incendios' },
  { key: 'inicio.serv.1.desc', page: 'Inicio', label: 'Servicio 1 · descripción', kind: 'text', defaultHtml: 'Combate y prevención de incendios estructurales, forestales y vehiculares' },
  { key: 'inicio.serv.2.title', page: 'Inicio', label: 'Servicio 2 · título', kind: 'text', defaultHtml: 'Emergencias Médicas' },
  { key: 'inicio.serv.2.desc', page: 'Inicio', label: 'Servicio 2 · descripción', kind: 'text', defaultHtml: 'Atención prehospitalaria y traslado de pacientes en situación de emergencia' },
  { key: 'inicio.serv.3.title', page: 'Inicio', label: 'Servicio 3 · título', kind: 'text', defaultHtml: 'Rescate' },
  { key: 'inicio.serv.3.desc', page: 'Inicio', label: 'Servicio 3 · descripción', kind: 'text', defaultHtml: 'Operaciones de búsqueda y rescate en estructuras colapsadas y espacios confinados' },
  { key: 'inicio.serv.4.title', page: 'Inicio', label: 'Servicio 4 · título', kind: 'text', defaultHtml: 'Capacitación' },
  { key: 'inicio.serv.4.desc', page: 'Inicio', label: 'Servicio 4 · descripción', kind: 'text', defaultHtml: 'Formación continua y cursos de prevención abiertos a la comunidad' },
  { key: 'inicio.cta.title', page: 'Inicio', label: 'Llamado a la acción · título', kind: 'text', defaultHtml: '¿Quieres ser voluntario?' },
  {
    key: 'inicio.cta.text', page: 'Inicio', label: 'Llamado a la acción · texto', kind: 'rich',
    defaultHtml: 'Únete a la familia bomberil más grande del Perú. No necesitas experiencia previa — solo vocación de servicio.',
  },
  { key: 'inicio.contacto.horario', page: 'Inicio', label: 'Franja de contacto · horario', kind: 'text', defaultHtml: '24 horas, 365 días del año' },

  // ── Nosotros ────────────────────────────────────────────────────────────
  { key: 'nosotros.hero.overline', page: 'Nosotros', label: 'Hero · etiqueta', kind: 'text', defaultHtml: 'Nuestra historia' },
  { key: 'nosotros.hero.title', page: 'Nosotros', label: 'Hero · título', kind: 'rich', defaultHtml: 'QUIÉNES SOMOS' },
  { key: 'nosotros.hero.subtitle', page: 'Nosotros', label: 'Hero · subtítulo', kind: 'rich', defaultHtml: 'Más de dos décadas protegiendo a la comunidad de Ancón con vocación, disciplina y entrega total.' },
  { key: 'nosotros.historia.overline', page: 'Nosotros', label: 'Historia · etiqueta', kind: 'text', defaultHtml: 'Fundación' },
  { key: 'nosotros.historia.1.year', page: 'Nosotros', label: 'Historia · hito 1 · año', kind: 'text', defaultHtml: '2000' },
  { key: 'nosotros.historia.1.text', page: 'Nosotros', label: 'Historia · hito 1 · texto', kind: 'rich', defaultHtml: 'Fundación de la Compañía de Bomberos Voluntarios Nº 163, respondiendo a la necesidad de protección de la comunidad de Ancón.' },
  { key: 'nosotros.historia.2.year', page: 'Nosotros', label: 'Historia · hito 2 · año', kind: 'text', defaultHtml: '2005' },
  { key: 'nosotros.historia.2.text', page: 'Nosotros', label: 'Historia · hito 2 · texto', kind: 'rich', defaultHtml: 'Consolidación operativa con la adquisición de la primera unidad de combate contra incendios y equipamiento básico.' },
  { key: 'nosotros.historia.3.year', page: 'Nosotros', label: 'Historia · hito 3 · año', kind: 'text', defaultHtml: '2012' },
  { key: 'nosotros.historia.3.text', page: 'Nosotros', label: 'Historia · hito 3 · texto', kind: 'rich', defaultHtml: 'Ampliación de servicios a emergencias médicas prehospitalarias y rescate vehicular en la Panamericana Norte.' },
  { key: 'nosotros.historia.4.year', page: 'Nosotros', label: 'Historia · hito 4 · año', kind: 'text', defaultHtml: '2020' },
  { key: 'nosotros.historia.4.text', page: 'Nosotros', label: 'Historia · hito 4 · texto', kind: 'rich', defaultHtml: 'Dos décadas de servicio ininterrumpido. Participación activa durante la emergencia sanitaria nacional.' },
  { key: 'nosotros.proposito.overline', page: 'Nosotros', label: 'Propósito · etiqueta', kind: 'text', defaultHtml: 'Propósito' },
  { key: 'nosotros.proposito.title', page: 'Nosotros', label: 'Propósito · título', kind: 'rich', defaultHtml: 'Nuestra razón de ser' },
  { key: 'nosotros.proposito.intro', page: 'Nosotros', label: 'Propósito · párrafo', kind: 'rich', defaultHtml: 'Guiados por nuestro lema, cada acción refleja nuestro compromiso con la vida humana.' },
  { key: 'nosotros.mvv.1.title', page: 'Nosotros', label: 'Misión · título', kind: 'text', defaultHtml: 'Misión' },
  { key: 'nosotros.mvv.1.text', page: 'Nosotros', label: 'Misión · texto', kind: 'rich', defaultHtml: 'Salvar vidas, proteger bienes y prevenir siniestros en el distrito de Ancón y zonas aledañas, brindando un servicio voluntario de excelencia las 24 horas del día, los 365 días del año.' },
  { key: 'nosotros.mvv.2.title', page: 'Nosotros', label: 'Visión · título', kind: 'text', defaultHtml: 'Visión' },
  { key: 'nosotros.mvv.2.text', page: 'Nosotros', label: 'Visión · texto', kind: 'rich', defaultHtml: 'Ser reconocidos como una compañía de bomberos modelo a nivel nacional, con personal altamente capacitado, equipamiento de vanguardia y una comunidad comprometida con la prevención.' },
  { key: 'nosotros.mvv.3.title', page: 'Nosotros', label: 'Valores · título', kind: 'text', defaultHtml: 'Valores' },
  { key: 'nosotros.mvv.3.text', page: 'Nosotros', label: 'Valores · texto', kind: 'rich', defaultHtml: 'Vocación de servicio, disciplina, honor, lealtad, solidaridad y trabajo en equipo. Cada voluntario encarna estos principios dentro y fuera del cuartel.' },
  { key: 'nosotros.cifras.1.value', page: 'Nosotros', label: 'Cifra 1 · valor', kind: 'text', defaultHtml: '25+' },
  { key: 'nosotros.cifras.1.label', page: 'Nosotros', label: 'Cifra 1 · etiqueta', kind: 'text', defaultHtml: 'Años de servicio' },
  { key: 'nosotros.cifras.2.value', page: 'Nosotros', label: 'Cifra 2 · valor', kind: 'text', defaultHtml: '24/7' },
  { key: 'nosotros.cifras.2.label', page: 'Nosotros', label: 'Cifra 2 · etiqueta', kind: 'text', defaultHtml: 'Disponibilidad' },
  { key: 'nosotros.cifras.3.value', page: 'Nosotros', label: 'Cifra 3 · valor', kind: 'text', defaultHtml: '40+' },
  { key: 'nosotros.cifras.3.label', page: 'Nosotros', label: 'Cifra 3 · etiqueta', kind: 'text', defaultHtml: 'Voluntarios' },
  { key: 'nosotros.cifras.4.value', page: 'Nosotros', label: 'Cifra 4 · valor', kind: 'text', defaultHtml: '1000+' },
  { key: 'nosotros.cifras.4.label', page: 'Nosotros', label: 'Cifra 4 · etiqueta', kind: 'text', defaultHtml: 'Emergencias atendidas' },

  // ── Servicios ───────────────────────────────────────────────────────────
  { key: 'servicios.hero.overline', page: 'Servicios', label: 'Hero · etiqueta', kind: 'text', defaultHtml: 'Operaciones' },
  { key: 'servicios.hero.title', page: 'Servicios', label: 'Hero · título', kind: 'rich', defaultHtml: 'NUESTROS SERVICIOS' },
  { key: 'servicios.hero.subtitle', page: 'Servicios', label: 'Hero · subtítulo', kind: 'rich', defaultHtml: 'Respondemos a toda emergencia que amenace la vida, la propiedad o el medio ambiente en nuestra jurisdicción.' },
  { key: 'servicios.acc.overline', page: 'Servicios', label: 'Líneas de acción · etiqueta', kind: 'text', defaultHtml: 'Líneas de acción' },
  { key: 'servicios.acc.title', page: 'Servicios', label: 'Líneas de acción · título', kind: 'rich', defaultHtml: 'Emergencia & prevención' },
  { key: 'servicios.acc.intro', page: 'Servicios', label: 'Líneas de acción · párrafo', kind: 'rich', defaultHtml: 'Operamos bajo los protocolos del Cuerpo General de Bomberos Voluntarios del Perú, con capacitación continua y equipamiento especializado.' },
  { key: 'servicios.serv.1.title', page: 'Servicios', label: 'Servicio 1 · título', kind: 'text', defaultHtml: 'Incendios Estructurales y Forestales' },
  { key: 'servicios.serv.1.desc', page: 'Servicios', label: 'Servicio 1 · descripción', kind: 'rich', defaultHtml: 'Combate de incendios en edificaciones, viviendas, industrias y áreas forestales. Incluye ventilación, búsqueda de víctimas y salvamento de bienes.' },
  { key: 'servicios.serv.1.det.1', page: 'Servicios', label: 'Servicio 1 · viñeta 1', kind: 'text', defaultHtml: 'Incendios en viviendas y comercios' },
  { key: 'servicios.serv.1.det.2', page: 'Servicios', label: 'Servicio 1 · viñeta 2', kind: 'text', defaultHtml: 'Incendios vehiculares' },
  { key: 'servicios.serv.1.det.3', page: 'Servicios', label: 'Servicio 1 · viñeta 3', kind: 'text', defaultHtml: 'Incendios forestales y de interfaz' },
  { key: 'servicios.serv.1.det.4', page: 'Servicios', label: 'Servicio 1 · viñeta 4', kind: 'text', defaultHtml: 'Fugas de gas y materiales peligrosos' },
  { key: 'servicios.serv.2.title', page: 'Servicios', label: 'Servicio 2 · título', kind: 'text', defaultHtml: 'Emergencias Médicas Prehospitalarias' },
  { key: 'servicios.serv.2.desc', page: 'Servicios', label: 'Servicio 2 · descripción', kind: 'rich', defaultHtml: 'Atención de primeros auxilios, estabilización y traslado de pacientes. Personal capacitado en soporte vital básico y avanzado.' },
  { key: 'servicios.serv.2.det.1', page: 'Servicios', label: 'Servicio 2 · viñeta 1', kind: 'text', defaultHtml: 'Atención de accidentados' },
  { key: 'servicios.serv.2.det.2', page: 'Servicios', label: 'Servicio 2 · viñeta 2', kind: 'text', defaultHtml: 'Soporte vital básico (BLS)' },
  { key: 'servicios.serv.2.det.3', page: 'Servicios', label: 'Servicio 2 · viñeta 3', kind: 'text', defaultHtml: 'Traslado de emergencia' },
  { key: 'servicios.serv.2.det.4', page: 'Servicios', label: 'Servicio 2 · viñeta 4', kind: 'text', defaultHtml: 'Atención en eventos masivos' },
  { key: 'servicios.serv.3.title', page: 'Servicios', label: 'Servicio 3 · título', kind: 'text', defaultHtml: 'Rescate y Búsqueda' },
  { key: 'servicios.serv.3.desc', page: 'Servicios', label: 'Servicio 3 · descripción', kind: 'rich', defaultHtml: 'Operaciones especializadas de búsqueda y rescate en diferentes escenarios de emergencia.' },
  { key: 'servicios.serv.3.det.1', page: 'Servicios', label: 'Servicio 3 · viñeta 1', kind: 'text', defaultHtml: 'Rescate vehicular (excarcelación)' },
  { key: 'servicios.serv.3.det.2', page: 'Servicios', label: 'Servicio 3 · viñeta 2', kind: 'text', defaultHtml: 'Rescate en estructuras colapsadas' },
  { key: 'servicios.serv.3.det.3', page: 'Servicios', label: 'Servicio 3 · viñeta 3', kind: 'text', defaultHtml: 'Rescate en espacios confinados' },
  { key: 'servicios.serv.3.det.4', page: 'Servicios', label: 'Servicio 3 · viñeta 4', kind: 'text', defaultHtml: 'Búsqueda de personas perdidas' },
  { key: 'servicios.serv.4.title', page: 'Servicios', label: 'Servicio 4 · título', kind: 'text', defaultHtml: 'Materiales Peligrosos' },
  { key: 'servicios.serv.4.desc', page: 'Servicios', label: 'Servicio 4 · descripción', kind: 'rich', defaultHtml: 'Identificación, contención y mitigación de incidentes con sustancias químicas, biológicas o radiológicas.' },
  { key: 'servicios.serv.4.det.1', page: 'Servicios', label: 'Servicio 4 · viñeta 1', kind: 'text', defaultHtml: 'Identificación de sustancias' },
  { key: 'servicios.serv.4.det.2', page: 'Servicios', label: 'Servicio 4 · viñeta 2', kind: 'text', defaultHtml: 'Contención de derrames' },
  { key: 'servicios.serv.4.det.3', page: 'Servicios', label: 'Servicio 4 · viñeta 3', kind: 'text', defaultHtml: 'Evacuación de zonas afectadas' },
  { key: 'servicios.serv.4.det.4', page: 'Servicios', label: 'Servicio 4 · viñeta 4', kind: 'text', defaultHtml: 'Descontaminación básica' },
  { key: 'servicios.serv.5.title', page: 'Servicios', label: 'Servicio 5 · título', kind: 'text', defaultHtml: 'Prevención y Capacitación' },
  { key: 'servicios.serv.5.desc', page: 'Servicios', label: 'Servicio 5 · descripción', kind: 'rich', defaultHtml: 'Actividades de prevención comunitaria, inspecciones técnicas de seguridad y capacitación ciudadana.' },
  { key: 'servicios.serv.5.det.1', page: 'Servicios', label: 'Servicio 5 · viñeta 1', kind: 'text', defaultHtml: 'Inspecciones de seguridad' },
  { key: 'servicios.serv.5.det.2', page: 'Servicios', label: 'Servicio 5 · viñeta 2', kind: 'text', defaultHtml: 'Charlas en colegios y empresas' },
  { key: 'servicios.serv.5.det.3', page: 'Servicios', label: 'Servicio 5 · viñeta 3', kind: 'text', defaultHtml: 'Simulacros de evacuación' },
  { key: 'servicios.serv.5.det.4', page: 'Servicios', label: 'Servicio 5 · viñeta 4', kind: 'text', defaultHtml: 'Planes de emergencia' },
  { key: 'servicios.cob.1.value', page: 'Servicios', label: 'Cobertura 1 · valor', kind: 'text', defaultHtml: '< 8 min' },
  { key: 'servicios.cob.1.label', page: 'Servicios', label: 'Cobertura 1 · etiqueta', kind: 'text', defaultHtml: 'Tiempo de respuesta promedio' },
  { key: 'servicios.cob.2.value', page: 'Servicios', label: 'Cobertura 2 · valor', kind: 'text', defaultHtml: '24/7' },
  { key: 'servicios.cob.2.label', page: 'Servicios', label: 'Cobertura 2 · etiqueta', kind: 'text', defaultHtml: 'Cobertura permanente' },
  { key: 'servicios.cob.3.value', page: 'Servicios', label: 'Cobertura 3 · valor', kind: 'text', defaultHtml: '116' },
  { key: 'servicios.cob.3.label', page: 'Servicios', label: 'Cobertura 3 · etiqueta', kind: 'text', defaultHtml: 'Línea de emergencias' },
  { key: 'servicios.cta.title', page: 'Servicios', label: 'CTA · título', kind: 'text', defaultHtml: '¿Necesitas ayuda?' },
  { key: 'servicios.cta.text', page: 'Servicios', label: 'CTA · texto', kind: 'rich', defaultHtml: 'Ante cualquier emergencia, no dudes en llamar. Estamos para protegerte.' },

  // ── Equipo ──────────────────────────────────────────────────────────────
  { key: 'equipo.hero.overline', page: 'Equipo', label: 'Hero · etiqueta', kind: 'text', defaultHtml: 'Personal voluntario' },
  { key: 'equipo.hero.title', page: 'Equipo', label: 'Hero · título', kind: 'rich', defaultHtml: 'NUESTRO EQUIPO' },
  { key: 'equipo.hero.subtitle', page: 'Equipo', label: 'Hero · subtítulo', kind: 'rich', defaultHtml: 'Bomberos voluntarios al servicio de la comunidad de Ancón. Personal formado bajo los lineamientos de la Escuela Básica (ESBAS) del Cuerpo General de Bomberos Voluntarios del Perú.' },
  { key: 'equipo.hero.stat1.value', page: 'Equipo', label: 'Hero · dato 1 · valor', kind: 'text', defaultHtml: '40+' },
  { key: 'equipo.hero.stat1.label', page: 'Equipo', label: 'Hero · dato 1 · etiqueta', kind: 'text', defaultHtml: 'Voluntarios activos' },
  { key: 'equipo.hero.stat2.value', page: 'Equipo', label: 'Hero · dato 2 · valor', kind: 'text', defaultHtml: '25' },
  { key: 'equipo.hero.stat2.label', page: 'Equipo', label: 'Hero · dato 2 · etiqueta', kind: 'text', defaultHtml: 'Años de servicio' },
  { key: 'equipo.jerarquia.overline', page: 'Equipo', label: 'Jerarquía · etiqueta', kind: 'text', defaultHtml: 'Organización' },
  { key: 'equipo.jerarquia.title', page: 'Equipo', label: 'Jerarquía · título', kind: 'rich', defaultHtml: 'Cadena de mando' },
  { key: 'equipo.jerarquia.intro', page: 'Equipo', label: 'Jerarquía · párrafo', kind: 'rich', defaultHtml: 'Estructura jerárquica de acuerdo con el Reglamento de Ingreso y Funcionamiento (RIF) del Cuerpo General de Bomberos Voluntarios del Perú. Art. 113-120.' },
  { key: 'equipo.jerarquia.1.rango', page: 'Equipo', label: 'Jerarquía 1 · rango', kind: 'text', defaultHtml: 'Primer Jefe de Compañía' },
  { key: 'equipo.jerarquia.1.grado', page: 'Equipo', label: 'Jerarquía 1 · grado', kind: 'text', defaultHtml: 'Brigadier' },
  { key: 'equipo.jerarquia.1.rol', page: 'Equipo', label: 'Jerarquía 1 · rol', kind: 'text', defaultHtml: 'Comando general, representación legal y administrativa de la compañía ante el CGBVP' },
  { key: 'equipo.jerarquia.2.rango', page: 'Equipo', label: 'Jerarquía 2 · rango', kind: 'text', defaultHtml: 'Segundo Jefe de Compañía' },
  { key: 'equipo.jerarquia.2.grado', page: 'Equipo', label: 'Jerarquía 2 · grado', kind: 'text', defaultHtml: 'Teniente Brigadier' },
  { key: 'equipo.jerarquia.2.rol', page: 'Equipo', label: 'Jerarquía 2 · rol', kind: 'text', defaultHtml: 'Reemplazo del Primer Jefe y supervisión de las secciones operativas' },
  { key: 'equipo.jerarquia.3.rango', page: 'Equipo', label: 'Jerarquía 3 · rango', kind: 'text', defaultHtml: 'Jefe de Sección de Máquinas' },
  { key: 'equipo.jerarquia.3.grado', page: 'Equipo', label: 'Jerarquía 3 · grado', kind: 'text', defaultHtml: 'Teniente' },
  { key: 'equipo.jerarquia.3.rol', page: 'Equipo', label: 'Jerarquía 3 · rol', kind: 'text', defaultHtml: 'Mantenimiento y operatividad del parque automotor y equipos mayores' },
  { key: 'equipo.jerarquia.4.rango', page: 'Equipo', label: 'Jerarquía 4 · rango', kind: 'text', defaultHtml: 'Jefe de Sección de Instrucción' },
  { key: 'equipo.jerarquia.4.grado', page: 'Equipo', label: 'Jerarquía 4 · grado', kind: 'text', defaultHtml: 'Teniente' },
  { key: 'equipo.jerarquia.4.rol', page: 'Equipo', label: 'Jerarquía 4 · rol', kind: 'text', defaultHtml: 'Formación, ESBAS y capacitación continua del personal' },
  { key: 'equipo.jerarquia.5.rango', page: 'Equipo', label: 'Jerarquía 5 · rango', kind: 'text', defaultHtml: 'Jefe de Sección Administrativa' },
  { key: 'equipo.jerarquia.5.grado', page: 'Equipo', label: 'Jerarquía 5 · grado', kind: 'text', defaultHtml: 'Subteniente' },
  { key: 'equipo.jerarquia.5.rol', page: 'Equipo', label: 'Jerarquía 5 · rol', kind: 'text', defaultHtml: 'Gestión documentaria, contabilidad y logística interna' },
  { key: 'equipo.jerarquia.6.rango', page: 'Equipo', label: 'Jerarquía 6 · rango', kind: 'text', defaultHtml: 'Jefe de Guardia' },
  { key: 'equipo.jerarquia.6.grado', page: 'Equipo', label: 'Jerarquía 6 · grado', kind: 'text', defaultHtml: 'Seccionario' },
  { key: 'equipo.jerarquia.6.rol', page: 'Equipo', label: 'Jerarquía 6 · rol', kind: 'text', defaultHtml: 'Control de guardia nocturna y respuesta inmediata ante alarmas' },
  { key: 'equipo.areas.overline', page: 'Equipo', label: 'Secciones · etiqueta', kind: 'text', defaultHtml: 'Especialidades' },
  { key: 'equipo.areas.title', page: 'Equipo', label: 'Secciones · título', kind: 'rich', defaultHtml: 'Secciones operativas' },
  { key: 'equipo.areas.intro', page: 'Equipo', label: 'Secciones · párrafo', kind: 'rich', defaultHtml: 'Cada sección cumple funciones específicas según el RIF del CGBVP, garantizando una respuesta integral ante cualquier tipo de emergencia.' },
  { key: 'equipo.areas.1.nombre', page: 'Equipo', label: 'Sección 1 · nombre', kind: 'text', defaultHtml: 'Combate de Incendios' },
  { key: 'equipo.areas.1.desc', page: 'Equipo', label: 'Sección 1 · descripción', kind: 'text', defaultHtml: 'Intervención en incendios estructurales, forestales y vehiculares' },
  { key: 'equipo.areas.1.miembros', page: 'Equipo', label: 'Sección 1 · efectivos', kind: 'text', defaultHtml: '12' },
  { key: 'equipo.areas.2.nombre', page: 'Equipo', label: 'Sección 2 · nombre', kind: 'text', defaultHtml: 'Atención Prehospitalaria' },
  { key: 'equipo.areas.2.desc', page: 'Equipo', label: 'Sección 2 · descripción', kind: 'text', defaultHtml: 'Estabilización y traslado de pacientes en emergencias médicas' },
  { key: 'equipo.areas.2.miembros', page: 'Equipo', label: 'Sección 2 · efectivos', kind: 'text', defaultHtml: '8' },
  { key: 'equipo.areas.3.nombre', page: 'Equipo', label: 'Sección 3 · nombre', kind: 'text', defaultHtml: 'Rescate y Salvamento' },
  { key: 'equipo.areas.3.desc', page: 'Equipo', label: 'Sección 3 · descripción', kind: 'text', defaultHtml: 'Operaciones en estructuras colapsadas, vehiculares y desniveles' },
  { key: 'equipo.areas.3.miembros', page: 'Equipo', label: 'Sección 3 · efectivos', kind: 'text', defaultHtml: '6' },
  { key: 'equipo.areas.4.nombre', page: 'Equipo', label: 'Sección 4 · nombre', kind: 'text', defaultHtml: 'Comunicaciones' },
  { key: 'equipo.areas.4.desc', page: 'Equipo', label: 'Sección 4 · descripción', kind: 'text', defaultHtml: 'Central de radio, despacho de unidades y coordinación interinstitucional' },
  { key: 'equipo.areas.4.miembros', page: 'Equipo', label: 'Sección 4 · efectivos', kind: 'text', defaultHtml: '4' },
  { key: 'equipo.areas.5.nombre', page: 'Equipo', label: 'Sección 5 · nombre', kind: 'text', defaultHtml: 'Máquinas y Equipos' },
  { key: 'equipo.areas.5.desc', page: 'Equipo', label: 'Sección 5 · descripción', kind: 'text', defaultHtml: 'Mantenimiento preventivo y correctivo del parque automotor' },
  { key: 'equipo.areas.5.miembros', page: 'Equipo', label: 'Sección 5 · efectivos', kind: 'text', defaultHtml: '5' },
  { key: 'equipo.areas.6.nombre', page: 'Equipo', label: 'Sección 6 · nombre', kind: 'text', defaultHtml: 'Instrucción y Capacitación' },
  { key: 'equipo.areas.6.desc', page: 'Equipo', label: 'Sección 6 · descripción', kind: 'text', defaultHtml: 'Escuelas Básicas (ESBAS) y formación continua según CGBVP' },
  { key: 'equipo.areas.6.miembros', page: 'Equipo', label: 'Sección 6 · efectivos', kind: 'text', defaultHtml: '5' },
  { key: 'equipo.efectivos.overline', page: 'Equipo', label: 'Efectivos · etiqueta', kind: 'text', defaultHtml: 'Efectivos' },
  { key: 'equipo.efectivos.title', page: 'Equipo', label: 'Efectivos · título', kind: 'rich', defaultHtml: 'Rostros del servicio' },
  { key: 'equipo.efectivos.intro', page: 'Equipo', label: 'Efectivos · párrafo', kind: 'rich', defaultHtml: 'Personal activo registrado en el sistema del CGBVP. Desde brigadieres hasta aspirantes, cada efectivo es parte fundamental de la cadena de atención de emergencias.' },
  { key: 'equipo.efectivos.placeholder', page: 'Equipo', label: 'Efectivos · nota inferior', kind: 'text', defaultHtml: 'Directorio de personal disponible proximamente' },

  // ── Contacto ────────────────────────────────────────────────────────────
  { key: 'contacto.hero.overline', page: 'Contacto', label: 'Hero · etiqueta', kind: 'text', defaultHtml: 'Comunícate' },
  { key: 'contacto.hero.title', page: 'Contacto', label: 'Hero · título', kind: 'rich', defaultHtml: 'CONTACTO' },
  { key: 'contacto.hero.subtitle', page: 'Contacto', label: 'Hero · subtítulo', kind: 'rich', defaultHtml: '¿Tienes preguntas, quieres ser voluntario o necesitas coordinar una visita? Escríbenos.' },
  { key: 'contacto.info.overline', page: 'Contacto', label: 'Información · etiqueta', kind: 'text', defaultHtml: 'Información' },
  { key: 'contacto.info.title', page: 'Contacto', label: 'Información · título', kind: 'rich', defaultHtml: 'Encuéntranos' },
  { key: 'contacto.info.1.label', page: 'Contacto', label: 'Info 1 · etiqueta', kind: 'text', defaultHtml: 'Dirección' },
  { key: 'contacto.info.1.value', page: 'Contacto', label: 'Info 1 · valor', kind: 'text', defaultHtml: 'Dirección de la compañía' },
  { key: 'contacto.info.1.sublabel', page: 'Contacto', label: 'Info 1 · subtexto', kind: 'text', defaultHtml: 'Lima, Perú' },
  { key: 'contacto.info.2.label', page: 'Contacto', label: 'Info 2 · etiqueta', kind: 'text', defaultHtml: 'Emergencias' },
  { key: 'contacto.info.2.value', page: 'Contacto', label: 'Info 2 · valor', kind: 'text', defaultHtml: '116' },
  { key: 'contacto.info.2.sublabel', page: 'Contacto', label: 'Info 2 · subtexto', kind: 'text', defaultHtml: 'Central' },
  { key: 'contacto.info.3.label', page: 'Contacto', label: 'Info 3 · etiqueta', kind: 'text', defaultHtml: 'Correo' },
  { key: 'contacto.info.3.value', page: 'Contacto', label: 'Info 3 · valor', kind: 'text', defaultHtml: 'contacto@bomberos163.pe' },
  { key: 'contacto.info.3.sublabel', page: 'Contacto', label: 'Info 3 · subtexto', kind: 'text', defaultHtml: 'Respondemos en 24-48 horas' },
  { key: 'contacto.info.4.label', page: 'Contacto', label: 'Info 4 · etiqueta', kind: 'text', defaultHtml: 'Atención administrativa' },
  { key: 'contacto.info.4.value', page: 'Contacto', label: 'Info 4 · valor', kind: 'text', defaultHtml: 'Lun - Sáb: 9:00 - 17:00' },
  { key: 'contacto.info.4.sublabel', page: 'Contacto', label: 'Info 4 · subtexto', kind: 'text', defaultHtml: 'Emergencias: 24/7' },
  { key: 'contacto.social.label', page: 'Contacto', label: 'Redes · etiqueta', kind: 'text', defaultHtml: 'Síguenos' },
  { key: 'contacto.form.title', page: 'Contacto', label: 'Formulario · título', kind: 'text', defaultHtml: 'Envíanos un mensaje' },
  { key: 'contacto.form.subtitle', page: 'Contacto', label: 'Formulario · subtítulo', kind: 'text', defaultHtml: 'Todos los campos marcados con * son obligatorios.' },
  { key: 'contacto.form.sent.title', page: 'Contacto', label: 'Formulario · enviado · título', kind: 'text', defaultHtml: 'Mensaje enviado' },
  { key: 'contacto.form.sent.text', page: 'Contacto', label: 'Formulario · enviado · texto', kind: 'rich', defaultHtml: 'Te responderemos en un máximo de 48 horas hábiles.' },

  // ── Cronograma ──────────────────────────────────────────────────────────
  { key: 'cronograma.hero.badge', page: 'Cronograma', label: 'Hero · etiqueta', kind: 'text', defaultHtml: 'Agenda Institucional' },
  { key: 'cronograma.hero.title', page: 'Cronograma', label: 'Hero · título', kind: 'text', defaultHtml: 'Cronograma de Actividades' },
  { key: 'cronograma.hero.subtitle', page: 'Cronograma', label: 'Hero · subtítulo', kind: 'rich', defaultHtml: 'Calendario institucional de la Compañía. Conoce nuestras actividades operativas, de instrucción, comunitarias y eventos públicos.' },

  // ── Admisión ────────────────────────────────────────────────────────────
  {
    key: 'admision.hero.badge', page: 'Admisión', label: 'Etiqueta superior del hero',
    kind: 'text', defaultHtml: 'Convocatoria abierta',
    hint: 'Texto corto en mayúsculas junto a la línea roja del encabezado.',
  },
  {
    key: 'admision.hero.subtitle', page: 'Admisión', label: 'Subtítulo del hero',
    kind: 'rich',
    defaultHtml: 'No necesitas experiencia previa. Solo necesitas vocación de servicio y ganas de proteger a tu comunidad.',
  },
  {
    key: 'admision.form.intro', page: 'Admisión', label: 'Texto sobre el formulario',
    kind: 'rich',
    defaultHtml: 'Completa tus datos y adjunta tu CERTIJOVEN en PDF para postular a la convocatoria vigente.',
  },
  {
    key: 'admision.porque', page: 'Admisión', label: 'Bloque «¿Por qué ser voluntario?»',
    kind: 'rich',
    defaultHtml: 'Ser bombero es más que una actividad — es una forma de vida dedicada al prójimo.',
  },
]

export const EDITABLE_BLOCK_KEYS = EDITABLE_BLOCKS.map(b => b.key)
