import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'
import { ProjectConfig, resourceName, applyTags } from '../config'

export interface DynamoStackProps extends cdk.StackProps {
  config: ProjectConfig
}

/**
 * Todas las tablas DynamoDB del proyecto.
 *
 * Diseño multi-tabla: una tabla por entidad (más fácil de escalar y
 * entender que single-table design). PAY_PER_REQUEST para costo mínimo.
 *
 * Todas las tablas se exportan para que otros stacks puedan otorgar
 * permisos a la Lambda de la app y al scraper.
 */
export class DynamoStack extends cdk.Stack {
  // Auth
  public readonly usersTable: dynamodb.Table
  public readonly profilesTable: dynamodb.Table
  public readonly sectionRolesTable: dynamodb.Table
  public readonly sectionsTable: dynamodb.Table

  // Guardia nocturna
  public readonly guardReservationsTable: dynamodb.Table
  public readonly guardDormitoriesTable: dynamodb.Table
  public readonly guardBunksTable: dynamodb.Table
  public readonly guardBedsTable: dynamodb.Table

  // Operativo
  public readonly incidentsTable: dynamodb.Table
  public readonly requestsTable: dynamodb.Table
  public readonly internalRequestsTable: dynamodb.Table
  public readonly serviceHoursTable: dynamodb.Table

  // Inventario
  public readonly inventoryTable: dynamodb.Table
  public readonly inventoryAttachmentsTable: dynamodb.Table

  // Máquinas
  public readonly machinesTable: dynamodb.Table
  public readonly machineCompartmentsTable: dynamodb.Table
  public readonly machineChecklistsTable: dynamodb.Table

  // Capacitación
  public readonly trainingCoursesTable: dynamodb.Table
  public readonly trainingProgressTable: dynamodb.Table
  public readonly trainingCertificatesTable: dynamodb.Table
  public readonly libraryDocumentsTable: dynamodb.Table

  // CGBVP (integración scraper)
  public readonly emergenciesTable: dynamodb.Table
  public readonly emergencyCrewTable: dynamodb.Table
  public readonly cgbvpAttendanceTable: dynamodb.Table
  public readonly cgbvpSyncTable: dynamodb.Table
  public readonly cgbvpStatusTable: dynamodb.Table

  // Contenido
  public readonly announcementsTable: dynamodb.Table
  public readonly contentCalendarTable: dynamodb.Table
  public readonly icsTable: dynamodb.Table

  // Lista de todas las tablas para facilitar grants en bloque
  public readonly allTables: dynamodb.Table[]

  constructor(scope: Construct, id: string, props: DynamoStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const { config } = props
    const removalPolicy = cdk.RemovalPolicy.DESTROY // dev: permite borrar limpio

    // ─────────────────────────────────────────────────────────────────────
    // Helpers internos
    // ─────────────────────────────────────────────────────────────────────
    const table = (
      id: string,
      suffix: string,
      partitionKey: dynamodb.Attribute,
      sortKey?: dynamodb.Attribute
    ): dynamodb.Table =>
      new dynamodb.Table(this, id, {
        tableName: resourceName(config, suffix),
        partitionKey,
        sortKey,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        pointInTimeRecovery: false, // dev: ahorrar costo; true en prod
        removalPolicy,
      })

    // ─────────────────────────────────────────────────────────────────────
    // AUTH — usuarios y perfiles
    // ─────────────────────────────────────────────────────────────────────

    this.usersTable = table('UsersTable', 'users',
      { name: 'userId', type: dynamodb.AttributeType.STRING }
    )
    // Login por email
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    })

    this.profilesTable = table('ProfilesTable', 'profiles',
      { name: 'profileId', type: dynamodb.AttributeType.STRING }
    )
    // Buscar perfil por email, DNI, userId o código CGBVP
    this.profilesTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    })
    this.profilesTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    })
    this.profilesTable.addGlobalSecondaryIndex({
      indexName: 'dni-index',
      partitionKey: { name: 'dni', type: dynamodb.AttributeType.STRING },
    })
    this.profilesTable.addGlobalSecondaryIndex({
      indexName: 'codigoCgbvp-index',
      partitionKey: { name: 'codigoCgbvp', type: dynamodb.AttributeType.STRING },
    })

    // PK=profileId, SK=sectionId → roles de un perfil por sección
    this.sectionRolesTable = table('SectionRolesTable', 'section-roles',
      { name: 'profileId', type: dynamodb.AttributeType.STRING },
      { name: 'sectionId', type: dynamodb.AttributeType.STRING }
    )
    // Roles de una sección (quiénes pertenecen a una sección)
    this.sectionRolesTable.addGlobalSecondaryIndex({
      indexName: 'sectionId-index',
      partitionKey: { name: 'sectionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
    })

    this.sectionsTable = table('SectionsTable', 'sections',
      { name: 'sectionId', type: dynamodb.AttributeType.STRING }
    )
    // Buscar sección por clave (key = 'maquinas', 'jefatura', etc.)
    this.sectionsTable.addGlobalSecondaryIndex({
      indexName: 'key-index',
      partitionKey: { name: 'key', type: dynamodb.AttributeType.STRING },
    })

    // ─────────────────────────────────────────────────────────────────────
    // GUARDIA NOCTURNA
    // ─────────────────────────────────────────────────────────────────────

    // PK=date (YYYY-MM-DD), SK=profileId → reserva por día
    this.guardReservationsTable = table('GuardReservationsTable', 'guard-reservations',
      { name: 'date', type: dynamodb.AttributeType.STRING },
      { name: 'profileId', type: dynamodb.AttributeType.STRING }
    )
    // Historial de reservas por perfil
    this.guardReservationsTable.addGlobalSecondaryIndex({
      indexName: 'profileId-index',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
    })

    this.guardDormitoriesTable = table('GuardDormitoriesTable', 'guard-dormitories',
      { name: 'dormId', type: dynamodb.AttributeType.STRING }
    )

    this.guardBunksTable = table('GuardBunksTable', 'guard-bunks',
      { name: 'dormId', type: dynamodb.AttributeType.STRING },
      { name: 'bunkId', type: dynamodb.AttributeType.STRING }
    )

    this.guardBedsTable = table('GuardBedsTable', 'guard-beds',
      { name: 'bunkId', type: dynamodb.AttributeType.STRING },
      { name: 'bedId', type: dynamodb.AttributeType.STRING }
    )
    this.guardBedsTable.addGlobalSecondaryIndex({
      indexName: 'dormId-index',
      partitionKey: { name: 'dormId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'bunkId', type: dynamodb.AttributeType.STRING },
    })

    // ─────────────────────────────────────────────────────────────────────
    // OPERATIVO
    // ─────────────────────────────────────────────────────────────────────

    this.incidentsTable = table('IncidentsTable', 'incidents',
      { name: 'incidentId', type: dynamodb.AttributeType.STRING }
    )
    // Incidentes por sección ordenados por fecha
    this.incidentsTable.addGlobalSecondaryIndex({
      indexName: 'sectionId-createdAt-index',
      partitionKey: { name: 'sectionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })
    this.incidentsTable.addGlobalSecondaryIndex({
      indexName: 'status-createdAt-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    this.requestsTable = table('RequestsTable', 'requests',
      { name: 'requestId', type: dynamodb.AttributeType.STRING }
    )
    this.requestsTable.addGlobalSecondaryIndex({
      indexName: 'sectionId-createdAt-index',
      partitionKey: { name: 'sectionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    this.internalRequestsTable = table('InternalRequestsTable', 'internal-requests',
      { name: 'requestId', type: dynamodb.AttributeType.STRING }
    )
    this.internalRequestsTable.addGlobalSecondaryIndex({
      indexName: 'toSectionId-createdAt-index',
      partitionKey: { name: 'toSectionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // PK=profileId, SK=timestamp#hoursId → horas por perfil ordenadas
    this.serviceHoursTable = table('ServiceHoursTable', 'service-hours',
      { name: 'profileId', type: dynamodb.AttributeType.STRING },
      { name: 'sk', type: dynamodb.AttributeType.STRING }
    )

    // ─────────────────────────────────────────────────────────────────────
    // INVENTARIO
    // ─────────────────────────────────────────────────────────────────────

    this.inventoryTable = table('InventoryTable', 'inventory',
      { name: 'itemId', type: dynamodb.AttributeType.STRING }
    )
    this.inventoryTable.addGlobalSecondaryIndex({
      indexName: 'sectionId-index',
      partitionKey: { name: 'sectionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemId', type: dynamodb.AttributeType.STRING },
    })
    this.inventoryTable.addGlobalSecondaryIndex({
      indexName: 'category-index',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemId', type: dynamodb.AttributeType.STRING },
    })

    // PK=itemId, SK=attachmentId
    this.inventoryAttachmentsTable = table('InventoryAttachmentsTable', 'inventory-attachments',
      { name: 'itemId', type: dynamodb.AttributeType.STRING },
      { name: 'attachmentId', type: dynamodb.AttributeType.STRING }
    )

    // ─────────────────────────────────────────────────────────────────────
    // MÁQUINAS
    // ─────────────────────────────────────────────────────────────────────

    this.machinesTable = table('MachinesTable', 'machines',
      { name: 'machineId', type: dynamodb.AttributeType.STRING }
    )

    this.machineCompartmentsTable = table('MachineCompartmentsTable', 'machine-compartments',
      { name: 'machineId', type: dynamodb.AttributeType.STRING },
      { name: 'compartmentId', type: dynamodb.AttributeType.STRING }
    )

    this.machineChecklistsTable = table('MachineChecklistsTable', 'machine-checklists',
      { name: 'machineId', type: dynamodb.AttributeType.STRING },
      { name: 'checklistId', type: dynamodb.AttributeType.STRING }
    )
    this.machineChecklistsTable.addGlobalSecondaryIndex({
      indexName: 'profileId-date-index',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
    })

    // ─────────────────────────────────────────────────────────────────────
    // CAPACITACIÓN
    // ─────────────────────────────────────────────────────────────────────

    this.trainingCoursesTable = table('TrainingCoursesTable', 'training-courses',
      { name: 'courseId', type: dynamodb.AttributeType.STRING }
    )
    this.trainingCoursesTable.addGlobalSecondaryIndex({
      indexName: 'type-index',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'courseId', type: dynamodb.AttributeType.STRING },
    })

    // PK=profileId, SK=courseId
    this.trainingProgressTable = table('TrainingProgressTable', 'training-progress',
      { name: 'profileId', type: dynamodb.AttributeType.STRING },
      { name: 'courseId', type: dynamodb.AttributeType.STRING }
    )

    // PK=profileId, SK=certificateId
    this.trainingCertificatesTable = table('TrainingCertificatesTable', 'training-certificates',
      { name: 'profileId', type: dynamodb.AttributeType.STRING },
      { name: 'certificateId', type: dynamodb.AttributeType.STRING }
    )

    // PK=docId — biblioteca institucional de documentos
    this.libraryDocumentsTable = table('LibraryDocumentsTable', 'library-documents',
      { name: 'docId', type: dynamodb.AttributeType.STRING }
    )
    this.libraryDocumentsTable.addGlobalSecondaryIndex({
      indexName: 'category-uploadedAt-index',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadedAt', type: dynamodb.AttributeType.STRING },
    })

    // ─────────────────────────────────────────────────────────────────────
    // CGBVP — integración scraper
    // ─────────────────────────────────────────────────────────────────────

    this.emergenciesTable = table('EmergenciesTable', 'emergencies',
      { name: 'emergencyId', type: dynamodb.AttributeType.STRING }
    )
    this.emergenciesTable.addGlobalSecondaryIndex({
      indexName: 'date-index',
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'emergencyId', type: dynamodb.AttributeType.STRING },
    })

    // PK=emergencyId, SK=profileId
    this.emergencyCrewTable = table('EmergencyCrewTable', 'emergency-crew',
      { name: 'emergencyId', type: dynamodb.AttributeType.STRING },
      { name: 'profileId', type: dynamodb.AttributeType.STRING }
    )
    // Emergencias en las que participó un bombero
    this.emergencyCrewTable.addGlobalSecondaryIndex({
      indexName: 'profileId-index',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'emergencyId', type: dynamodb.AttributeType.STRING },
    })

    // PK=profileId, SK=date (YYYY-MM-DD)
    this.cgbvpAttendanceTable = table('CgbvpAttendanceTable', 'cgbvp-attendance',
      { name: 'profileId', type: dynamodb.AttributeType.STRING },
      { name: 'date', type: dynamodb.AttributeType.STRING }
    )

    // PK=syncType (estado-cia|partes-cia|sgo|...), SK=timestamp ISO
    this.cgbvpSyncTable = table('CgbvpSyncTable', 'cgbvp-sync',
      { name: 'syncType', type: dynamodb.AttributeType.STRING },
      { name: 'timestamp', type: dynamodb.AttributeType.STRING }
    )

    // Historial de estado CGBVP por bombero
    this.cgbvpStatusTable = table('CgbvpStatusTable', 'cgbvp-status',
      { name: 'profileId', type: dynamodb.AttributeType.STRING },
      { name: 'date', type: dynamodb.AttributeType.STRING }
    )

    // ─────────────────────────────────────────────────────────────────────
    // CONTENIDO
    // ─────────────────────────────────────────────────────────────────────

    this.announcementsTable = table('AnnouncementsTable', 'announcements',
      { name: 'announcementId', type: dynamodb.AttributeType.STRING }
    )
    this.announcementsTable.addGlobalSecondaryIndex({
      indexName: 'status-createdAt-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    this.contentCalendarTable = table('ContentCalendarTable', 'content-calendar',
      { name: 'eventId', type: dynamodb.AttributeType.STRING }
    )
    this.contentCalendarTable.addGlobalSecondaryIndex({
      indexName: 'date-index',
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    })

    this.icsTable = table('IcsTable', 'ics',
      { name: 'icsId', type: dynamodb.AttributeType.STRING }
    )

    // ─────────────────────────────────────────────────────────────────────
    // Lista consolidada para grants en bloque
    // ─────────────────────────────────────────────────────────────────────
    this.allTables = [
      this.usersTable,
      this.profilesTable,
      this.sectionRolesTable,
      this.sectionsTable,
      this.guardReservationsTable,
      this.guardDormitoriesTable,
      this.guardBunksTable,
      this.guardBedsTable,
      this.incidentsTable,
      this.requestsTable,
      this.internalRequestsTable,
      this.serviceHoursTable,
      this.inventoryTable,
      this.inventoryAttachmentsTable,
      this.machinesTable,
      this.machineCompartmentsTable,
      this.machineChecklistsTable,
      this.trainingCoursesTable,
      this.trainingProgressTable,
      this.trainingCertificatesTable,
      this.libraryDocumentsTable,
      this.emergenciesTable,
      this.emergencyCrewTable,
      this.cgbvpAttendanceTable,
      this.cgbvpSyncTable,
      this.cgbvpStatusTable,
      this.announcementsTable,
      this.contentCalendarTable,
      this.icsTable,
    ]

    // ─────────────────────────────────────────────────────────────────────
    // Outputs — nombres de tablas para referencia en consola
    // ─────────────────────────────────────────────────────────────────────
    const outputs: [string, dynamodb.Table][] = [
      ['UsersTableName', this.usersTable],
      ['ProfilesTableName', this.profilesTable],
      ['SectionsTableName', this.sectionsTable],
      ['IncidentsTableName', this.incidentsTable],
      ['InventoryTableName', this.inventoryTable],
      ['EmergenciesTableName', this.emergenciesTable],
    ]
    for (const [outId, tbl] of outputs) {
      new cdk.CfnOutput(this, outId, { value: tbl.tableName })
    }
  }
}
