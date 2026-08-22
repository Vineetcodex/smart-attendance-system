async function test() {
  const res = await fetch('http://localhost:5000/api/v1/auth/employee-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'EMP-1001', password: 'password123' }),
  });
  const data: any = await res.json();
  console.log('Login Success:', data.success);
  console.log('Employee Name:', data.data?.employee?.fullName);
  console.log('Face Embedding Dimensions:', data.data?.employee?.faceEmbedding?.length);
  console.log('Multi-Pose Embeddings Count:', data.data?.employee?.faceEmbeddings?.length || 0);
}

test().catch(console.error);
