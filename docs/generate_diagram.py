from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.network import CloudFront, APIGateway
from diagrams.aws.database import Dynamodb
from diagrams.aws.storage import S3
from diagrams.aws.security import WAF
from diagrams.aws.ml import Bedrock
from diagrams.aws.management import Cloudwatch
from diagrams.onprem.client import User
from diagrams.custom import Custom

graph_attr = {
    "fontsize": "24",
    "bgcolor": "white",
    "pad": "0.8",
    "nodesep": "0.6",
    "ranksep": "1.0",
}

with Diagram(
    "LLM Gateway Enterprise\nAWS-Native Architecture (Deployed)",
    show=False,
    direction="TB",
    filename="/Users/lillyjohnson/Projects/llmgw-ent-poc/docs/architecture-diagram",
    outformat="png",
    graph_attr=graph_attr,
):

    # Clients
    with Cluster("Clients"):
        developers = User("Developers\n(OpenAI SDK / curl)")
        admin = User("Platform\nAdmin")

    # Edge / Security
    with Cluster("Edge & Security"):
        waf = WAF("AWS WAF\n(planned)")
        cf = CloudFront("CloudFront\n(Admin UI)")

    # Admin UI
    with Cluster("Admin UI"):
        ui_s3 = S3("S3 Static\n(Next.js)")

    # Core Gateway
    with Cluster("Core Gateway (Serverless)"):
        apigw = APIGateway("HTTP API Gateway\n(7qegf6lerf)")
        gateway_lambda = Lambda("llmgw-gateway\n(Node 20, 512MB)")

    # Bedrock Models
    with Cluster("Amazon Bedrock - Multi-Model"):
        claude = Bedrock("Claude\nSonnet 4.6")
        deepseek = Bedrock("DeepSeek\nV3.2")
        haiku = Bedrock("Claude\nHaiku 4.5")
        nova = Bedrock("Amazon\nNova Pro")
        llama = Bedrock("Meta Llama\n3.3 70B")

    # Fallback
    with Cluster("Fallback Provider"):
        openrouter = Lambda("OpenRouter\n(Nemotron free)")

    # Data Layer
    with Cluster("Data & State"):
        ddb = Dynamodb("DynamoDB\n(llmgw-keys)\nKeys|Teams|Orgs|Spend")

    # Observability
    with Cluster("Observability"):
        cw = Cloudwatch("CloudWatch\nLogs + Metrics")

    # === Flows ===

    # Developer flow (API requests)
    developers >> apigw >> gateway_lambda

    # Admin flow (UI)
    admin >> cf >> ui_s3

    # Admin API calls (UI → API Gateway)
    cf >> Edge(color="gray", style="dashed", label="fetch /admin/*") >> apigw

    # Lambda → Models (routing with BU tag in requestMetadata)
    gateway_lambda >> Edge(color="blue", style="bold", label="Converse API\n+ BU tag") >> claude
    gateway_lambda >> Edge(color="blue") >> deepseek
    gateway_lambda >> Edge(color="blue") >> haiku
    gateway_lambda >> Edge(color="blue") >> nova
    gateway_lambda >> Edge(color="blue") >> llama

    # Lambda → Fallback
    gateway_lambda >> Edge(color="orange", style="dashed", label="fallback") >> openrouter

    # Lambda → Data
    gateway_lambda >> Edge(color="green", label="auth + spend") >> ddb

    # Lambda → Observability
    gateway_lambda >> Edge(color="gray", style="dotted") >> cw
