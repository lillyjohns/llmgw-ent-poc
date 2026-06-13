from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import ECS, Fargate, Lambda
from diagrams.aws.network import ALB, CloudFront, APIGateway
from diagrams.aws.database import Dynamodb, DynamodbDax
from diagrams.aws.analytics import KinesisDataFirehose, Athena
from diagrams.aws.storage import S3
from diagrams.aws.security import Cognito, WAF, SecretsManager
from diagrams.aws.ml import Bedrock
from diagrams.aws.management import Cloudwatch
from diagrams.aws.devtools import XRay
from diagrams.onprem.client import User

graph_attr = {
    "fontsize": "24",
    "bgcolor": "white",
    "pad": "0.8",
    "nodesep": "0.6",
    "ranksep": "1.0",
}

with Diagram(
    "LLM Gateway Enterprise\nAWS-Native Architecture",
    show=False,
    direction="TB",
    filename="/Users/lillyjohnson/Projects/llmgw-ent-poc/docs/architecture-diagram",
    outformat="png",
    graph_attr=graph_attr,
):

    # Clients
    with Cluster("Clients"):
        developers = User("Developers\n(OpenAI SDK)")
        admin = User("Platform\nAdmin")

    # Edge / Security Layer
    with Cluster("Edge & Security"):
        waf = WAF("AWS WAF")
        cf = CloudFront("CloudFront")

    # Admin Plane
    with Cluster("Admin Plane"):
        amplify = CloudFront("Amplify UI")
        apigw = APIGateway("API Gateway")
        cognito = Cognito("Cognito SSO")
        admin_lambda = Lambda("Admin APIs")

    # Core Gateway
    with Cluster("Core Gateway (Data Plane)"):
        alb = ALB("ALB")
        with Cluster("ECS Cluster"):
            proxy = Fargate("LLM Gateway\nProxy")

    # Bedrock Models
    with Cluster("Amazon Bedrock - Multi-Model"):
        claude = Bedrock("Claude\nSonnet 4.6")
        deepseek = Bedrock("DeepSeek\nV3.2")
        haiku = Bedrock("Claude\nHaiku 4.5")
        nova = Bedrock("Amazon\nNova Pro")
        llama = Bedrock("Meta Llama\n3.3 70B")

    # Guardrails
    guardrails = Bedrock("Bedrock\nGuardrails")

    # Data Layer
    with Cluster("Data & State"):
        dax = DynamodbDax("DAX\n(Cache)")
        ddb = Dynamodb("DynamoDB\n(Keys/Spend/Config)")
        secrets = SecretsManager("Secrets Mgr")

    # Analytics
    with Cluster("Observability & Analytics"):
        cw = Cloudwatch("CloudWatch")
        xray = XRay("X-Ray")
        firehose = KinesisDataFirehose("Firehose")
        s3 = S3("S3 (Logs)")
        athena = Athena("Athena\n(Reports)")

    # === Flows ===

    # Developer flow
    developers >> waf >> cf >> alb >> proxy

    # Admin flow
    admin >> amplify >> apigw >> admin_lambda >> ddb
    apigw >> cognito

    # Proxy → Models (routing)
    proxy >> Edge(color="blue", style="bold") >> claude
    proxy >> Edge(color="blue") >> deepseek
    proxy >> Edge(color="blue") >> haiku
    proxy >> Edge(color="blue") >> nova
    proxy >> Edge(color="blue") >> llama

    # Proxy → Guardrails
    proxy >> Edge(color="red", style="dashed") >> guardrails

    # Proxy → Data
    proxy >> dax >> ddb
    proxy >> secrets

    # Proxy → Observability
    proxy >> cw
    proxy >> xray
    proxy >> firehose >> s3 >> athena
