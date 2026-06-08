# Auth Testing Playbook

## Auth-Gated App Testing Playbook

### Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  auth_provider: 'google',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

### Step 2: Test Backend API
```
# Test auth endpoint with Bearer
curl -X GET "$API_URL/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# JWT signup/login
curl -X POST "$API_URL/api/auth/signup" -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"Passw0rd!","name":"Tester"}'
curl -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"Passw0rd!"}'
```

### Step 3: Browser Testing (Playwright)
```
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://your-app.com")
```

### Checklist
- [ ] User document has `user_id` field
- [ ] Session `user_id` matches user's `user_id`
- [ ] Queries use `{"_id": 0}` projection
- [ ] `/api/auth/me` returns user data for both JWT bearer and session_token cookie
- [ ] Dashboard loads without redirect when authenticated

### Success Indicators
- ✅ /api/auth/me returns user data
- ✅ Dashboard loads without redirect
- ✅ CRUD endpoints (stats, lists) work for authenticated users

### Failure Indicators
- ❌ 401 Unauthorized
- ❌ "User not found"
- ❌ Redirect loop to login
