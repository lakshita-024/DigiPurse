<h1 align="center">💸 Digital Wallet Backend API</h1>

<p align="center">
  <b>A secure, multi-currency wallet backend built with Node.js, Express, and MongoDB.</b><br>
  <i>Includes authentication, wallet operations, fraud detection, admin reporting, soft delete, scheduled jobs, and Swagger docs.</i>
</p>

<hr>

<h3>🚀 Features</h3>
<ul>
  <li>JWT authentication & protected routes</li>
  <li>Deposit, withdraw, transfer (INR, USD, EUR, GBP)</li>
  <li>Transaction history & soft delete</li>
  <li>Fraud detection & daily scheduled scan</li>
  <li>Admin APIs: flagged txns, balances, top users</li>
  <li>Mock email alerts for suspicious activity</li>
  <li>Interactive Swagger docs at <code>/api-docs</code></li>
</ul>

<h3>🛠️ Getting Started</h3>

<pre>
git clone https://github.com/Aastha0305/DigiPurse.git
cd DigiPurse
npm install
</pre>

<p>Create a <code>.env</code> file:</p>

<pre>
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
ADMIN_SECRET=your_admin_secret
</pre>

<pre>
npm run dev
</pre>

<p>Docs: <a href="http://localhost:3000/api-docs">http://localhost:3000/api-docs</a></p>

<h3>🔑 Authentication</h3>
<ul>
  <li>All endpoints require <code>Authorization: Bearer &lt;jwt&gt;</code></li>
  <li>Admin endpoints also need <code>Admin-Key: &lt;admin_secret&gt;</code></li>
</ul>

<h3>📦 Main Endpoints</h3>
<ul>
  <li><code>/api/auth/register</code>, <code>/api/auth/login</code></li>
  <li><code>/api/wallet/deposit</code>, <code>/api/wallet/withdraw</code>, <code>/api/wallet/transfer</code></li>
  <li><code>/api/wallet/transactions</code>, <code>/api/wallet/balance</code></li>
  <li><code>/api/wallet/admin/flagged-transactions</code>, <code>/api/wallet/admin/total-balances</code>, <code>/api/wallet/admin/top-users-by-balance</code></li>
  <li><code>/api/wallet/admin/users/:id</code>, <code>/api/wallet/admin/users/:id/restore</code>, <code>/api/wallet/admin/transactions/:id</code>, <code>/api/wallet/admin/transactions/:id/restore</code></li>
 </li>
</ul>

<h3>📝 License</h3>
<p>For educational/demo use.</p>

<p align="center"><b>Made by Aastha</b></p> 
