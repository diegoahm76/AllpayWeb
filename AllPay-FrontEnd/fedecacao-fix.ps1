# SOLUCIÓN DE EMERGENCIA - Variables de entorno directas
Write-Host "🚨 SOLUCIÓN DE EMERGENCIA - Usando variables de entorno directas..." -ForegroundColor Red

$EmergencyTaskDefJson = @'
{
  "family": "fedecacao-frontend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::356712705756:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::356712705756:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "356712705756.dkr.ecr.us-east-1.amazonaws.com/fedecacao-frontend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "NEXT_HOME_URL",
          "value": "https://recaudosfondonacionaldelcacao.com"
        },
        {
          "name": "AUTH_PATH",
          "value": "/api/auth"
        },
        {
          "name": "AUTH_URL",
          "value": "https://recaudosfondonacionaldelcacao.com/api/auth"
        },
        {
          "name": "AUTH_SECRET",
          "value": "MNNFD7qaTD9J8DnYnOk92ZI/dkwvcJmVHBIwOg+zPwk="
        },
        {
          "name": "BASE_API_URL",
          "value": "apii"
        },
        {
          "name": "CAPCHA_API",
          "value": "6Ld2xd4qAAAAAJ9FvZv5Y3ph_PJKz-_omYJu_KKl"
        },
        {
          "name": "CAPCHA_API_SECRET",
          "value": "6Ld2xd4qAAAAAD1EGD_YpviUS2eSJ6xOHbwC5QSS"
        },
        {
          "name": "API_KEY",
          "value": "sk_e7ee1f2db2b348fdb1a3c1e2464477e3"
        },
        {
          "name": "MERCHANT_ID",
          "value": "mjqpelewtyh6mij31jaq"
        },
        {
          "name": "BASE_OPEN_PAY",
          "value": "https://sandbox-api.openpay.co/v1/"
        },
        {
          "name": "NEXT_PUBLIC_LOGIN_REDIRECT_URL",
          "value": "https://recaudosfondonacionaldelcacao.com/auth/signin"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fedecacao-frontend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "essential": true
    }
  ]
}
'@

# Guardar a archivo
$EmergencyTaskDefJson | Out-File -FilePath "emergency-task-def.json" -Encoding UTF8

# Registrar task definition de emergencia
Write-Host "📝 Registrando task definition de emergencia..." -ForegroundColor Yellow
$NewTaskDefArn = aws ecs register-task-definition --cli-input-json file://emergency-task-def.json --region us-east-1 --query 'taskDefinition.taskDefinitionArn' --output text

if ($NewTaskDefArn) {
    Write-Host "✅ Task definition de emergencia creada: $NewTaskDefArn" -ForegroundColor Green
    
    # Actualizar servicio
    Write-Host "🔄 Actualizando servicio con task definition de emergencia..." -ForegroundColor Yellow
    aws ecs update-service --cluster fedecacao-cluster --service fedecacao-frontend-service --task-definition $NewTaskDefArn --region us-east-1
    
    Write-Host "⏳ Esperando 3 minutos para que el despliegue se complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 180
    
    # Verificar estado
    Write-Host "🔍 Verificando estado final..." -ForegroundColor Yellow
    aws ecs describe-services --cluster fedecacao-cluster --services fedecacao-frontend-service --region us-east-1 --query 'services[0].{Status:status, DesiredCount:desiredCount, RunningCount:runningCount, PendingCount:pendingCount}'
    
    Write-Host "🎉 ¡Solución de emergencia aplicada!" -ForegroundColor Green
    Write-Host "📋 Las variables de entorno ahora están embebidas directamente en la task definition" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Error crítico - No se pudo crear la task definition" -ForegroundColor Red
}

# Limpiar
Remove-Item "emergency-task-def.json" -ErrorAction SilentlyContinue