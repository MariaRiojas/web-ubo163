import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import { Construct } from 'constructs'
import { ProjectConfig, resourceName, applyTags } from '../config'

export interface ObservabilityStackProps extends cdk.StackProps {
  config: ProjectConfig
  webFunction: lambda.Function
  scraperFunction: lambda.Function
  distribution: cloudfront.Distribution
}

/**
 * CloudWatch dashboard + alarmas para arquitectura serverless.
 *
 * Alarmas:
 *   1. Web-Lambda-Errors   > 5 errores en 5 min
 *   2. Scraper-Lambda-Errors > 3 errores en 15 min
 *   3. CloudFront-5xx      > 5% de tasa de error en 5 min
 */
export class ObservabilityStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const { config, webFunction, scraperFunction, distribution } = props

    // ─────────────────────────────────────────────────────────────────────
    // Alarmas
    // ─────────────────────────────────────────────────────────────────────

    const webErrors = new cloudwatch.Alarm(this, 'WebLambdaErrors', {
      alarmName: resourceName(config, 'web-lambda-errors'),
      alarmDescription: 'Más de 5 errores en la Lambda Next.js en 5 min',
      metric: webFunction.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: cloudwatch.Statistic.SUM,
      }),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    })

    const scraperErrors = new cloudwatch.Alarm(this, 'ScraperLambdaErrors', {
      alarmName: resourceName(config, 'scraper-lambda-errors'),
      alarmDescription: 'Más de 3 errores en la Lambda del scraper en 15 min',
      metric: scraperFunction.metricErrors({
        period: cdk.Duration.minutes(15),
        statistic: cloudwatch.Statistic.SUM,
      }),
      threshold: 3,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    })

    const cf5xx = new cloudwatch.Alarm(this, 'CloudFront5xx', {
      alarmName: resourceName(config, 'cloudfront-5xx'),
      alarmDescription: 'Tasa de errores 5xx en CloudFront > 5% en 5 min',
      metric: distribution.metric5xxErrorRate({
        period: cdk.Duration.minutes(5),
        statistic: cloudwatch.Statistic.AVERAGE,
      }),
      threshold: 5,
      evaluationPeriods: 1,
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
        title: 'Web Lambda — Invocaciones y Errores',
        left: [webFunction.metricInvocations({ statistic: cloudwatch.Statistic.SUM })],
        right: [webFunction.metricErrors({ statistic: cloudwatch.Statistic.SUM })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Web Lambda — Duración (ms)',
        left: [
          webFunction.metricDuration({ statistic: 'p50' }),
          webFunction.metricDuration({ statistic: 'p95' }),
          webFunction.metricDuration({ statistic: 'p99' }),
        ],
        width: 12,
      })
    )

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Scraper Lambda — Invocaciones y Errores',
        left: [scraperFunction.metricInvocations({ statistic: cloudwatch.Statistic.SUM })],
        right: [scraperFunction.metricErrors({ statistic: cloudwatch.Statistic.SUM })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Scraper Lambda — Duración (ms)',
        left: [
          scraperFunction.metricDuration({ statistic: 'p50' }),
          scraperFunction.metricDuration({ statistic: 'p95' }),
        ],
        width: 12,
      })
    )

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CloudFront — Requests y Errores',
        left: [distribution.metricRequests({ statistic: cloudwatch.Statistic.SUM })],
        right: [
          distribution.metric4xxErrorRate(),
          distribution.metric5xxErrorRate(),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'CloudFront — Requests',
        left: [distribution.metricRequests({ statistic: cloudwatch.Statistic.SUM })],
        width: 12,
      })
    )

    this.dashboard.addWidgets(
      new cloudwatch.AlarmStatusWidget({
        title: 'Estado de alarmas',
        alarms: [webErrors, scraperErrors, cf5xx],
        width: 24,
      })
    )

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${config.region}.console.aws.amazon.com/cloudwatch/home?region=${config.region}#dashboards:name=${this.dashboard.dashboardName}`,
    })
  }
}
