import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'
import { ProjectConfig, applyTags } from '../config'

export interface NetworkStackProps extends cdk.StackProps {
  config: ProjectConfig
}

/**
 * Importa la VPC compartida existente (VPC001 / vpc-08fdfab5d388c249a).
 *
 * Este stack solo expone el objeto VPC para que los demás stacks importen
 * sus subnets y creen sus propios Security Groups. De esta forma evitamos
 * ciclos de dependencia cross-stack entre network ↔ database que CDK
 * detecta cuando los SG y sus reglas se comparten entre stacks.
 *
 * Nota: `Vpc.fromLookup` requiere credenciales AWS al sintetizar. En CI
 * sin credenciales se puede sustituir por `Vpc.fromVpcAttributes` con
 * subnets hardcodeadas.
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props)
    applyTags(this, props.config)

    const { config } = props

    // Modo offline: permite `cdk synth` sin credenciales AWS para validación.
    // Se activa con --context skipVpcLookup=true. Usa atributos falsos;
    // NO usar en cdk deploy.
    const skipLookupCtx = this.node.tryGetContext('skipVpcLookup')
    const skipLookup = skipLookupCtx === true || skipLookupCtx === 'true'

    if (skipLookup) {
      this.vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
        vpcId: config.vpcId,
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        publicSubnetIds: ['subnet-public-placeholder1', 'subnet-public-placeholder2'],
        privateSubnetIds: ['subnet-private-placeholder1', 'subnet-private-placeholder2'],
      })
    } else {
      this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
        vpcId: config.vpcId,
      })
    }

    new cdk.CfnOutput(this, 'VpcId', { value: this.vpc.vpcId })
  }
}
