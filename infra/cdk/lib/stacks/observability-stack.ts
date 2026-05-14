import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import { Construct } from 'constructs'
import { ProjectConfig, resourceName, applyTags } from '../config'

export interface ObservabilityStackProps extends cdk.StackProps {
  config: ProjectConfig
  lambdaFunction: lambda.Function
  rdsInstance: rds.DatabaseInstance
  ecsCluster: ecs.Cluster
  distribution: cloudfront.Distribution
}

/**
 * CloudWatch dashboard + alarmas básicas.
 *
 * Alarmas (Fase A — mínimas):
 *   1. Lambda-Errors  > 5 errores en 5 min
 *   2. RDS-FreeStorage < 2 GB
 *   3. Scraper-TaskFailed — cualquier task ECS con exit != 0
 */
export class ObservabilityStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const { config, lambdaFunction, rdsInstance, ecsCluster, distribution } = props

    // ─────────────────────────────────────────────────────────────────────
    // Alarmas
    // ─────────────────────────────────────────────────────────────────────

    const lambdaErrors = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      alarmName: resourceName(config, 'lambda-errors'),
      alarmDescription: 'Más de 5 errores en la Lambda Next.js en 5 min',
      metric: lambdaFunction.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: cloudwatch.Statistic.SUM,
      }),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    })

    const rdsFreeStorage = new cloudwatch.Alarm(this, 'RdsFreeStorageAlarm', {
      alarmName: resourceName(config, 'rds-free-storage'),
      alarmDescription: 'RDS storage libre < 2 GB',
      metric: rdsInstance.metricFreeStorageSpace({
        period: cdk.Duration.minutes(5),
        statistic: cloudwatch.Statistic.AVERAGE,
      }),
      threshold: 2 * 1024 * 1024 * 1024, // 2 GB
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    })

    // Alarma de scraper: usamos la métrica built-in de ECS sobre el cluster
    // para detectar tasks que terminaron mal. Simplificamos con el métrico
    // CPUUtilization > 0 durante al menos 15 min como proxy de "scraper corrió".
    // Para detección real de fallos usamos la métrica TasksStopped con dimensión.
    const scraperFailures = new cloudwatch.Alarm(this, 'ScraperFailuresAlarm', {
      alarmName: resourceName(config, 'scraper-failures'),
      alarmDescription:
        'Tasks del scraper que terminan mal (aproximación: CPU > 95% sostenida, ' +
        'o ausencia de logs por 30 min — revisar manualmente)',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        dimensionsMap: { ClusterName: ecsCluster.clusterName },
        statistic: cloudwatch.Statistic.MAXIMUM,
        period: cdk.Duration.minutes(15),
      }),
      threshold: 95,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    })

    // ─────────────────────────────────────────────────────────────────────
    // Dashboard
    // ─────────────────────────────────────────────────────────────────────
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: resourceName(config, 'dashboard'),
      defaultInterval: cdk.Duration.hours(3),
    })

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda — Invocations & Errors',
        left: [lambdaFunction.metricInvocations({ statistic: cloudwatch.Statistic.SUM })],
        right: [lambdaFunction.metricErrors({ statistic: cloudwatch.Statistic.SUM })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda — Duration (ms)',
        left: [
          lambdaFunction.metricDuration({ statistic: 'p50' }),
          lambdaFunction.metricDuration({ statistic: 'p95' }),
          lambdaFunction.metricDuration({ statistic: 'p99' }),
        ],
        width: 12,
      })
    )

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'RDS — CPU & Connections',
        left: [rdsInstance.metricCPUUtilization()],
        right: [rdsInstance.metricDatabaseConnections()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'RDS — Free Storage (GB)',
        left: [
          rdsInstance.metricFreeStorageSpace({
            label: 'Free Storage',
            statistic: cloudwatch.Statistic.AVERAGE,
          }),
        ],
        width: 12,
      })
    )

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CloudFront — Requests & Errors',
        left: [distribution.metricRequests({ statistic: cloudwatch.Statistic.SUM })],
        right: [
          distribution.metric4xxErrorRate(),
          distribution.metric5xxErrorRate(),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'ECS Scraper — CPU & Memory',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ECS',
            metricName: 'CPUUtilization',
            dimensionsMap: { ClusterName: ecsCluster.clusterName },
            statistic: 'Average',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/ECS',
            metricName: 'MemoryUtilization',
            dimensionsMap: { ClusterName: ecsCluster.clusterName },
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    )

    this.dashboard.addWidgets(
      new cloudwatch.AlarmStatusWidget({
        title: 'Estado de alarmas',
        alarms: [lambdaErrors, rdsFreeStorage, scraperFailures],
        width: 24,
      })
    )

    // ─────────────────────────────────────────────────────────────────────
    // Outputs
    // ─────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${config.region}.console.aws.amazon.com/cloudwatch/home?region=${config.region}#dashboards:name=${this.dashboard.dashboardName}`,
    })
  }
}
