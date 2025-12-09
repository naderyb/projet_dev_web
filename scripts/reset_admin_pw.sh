# generate bcrypt hash (requires node + bcryptjs installed) and update DB
NODE_HASH=$(node -e "const bcrypt=require('bcryptjs'); bcrypt.hashSync(process.argv[1],12) + '\\n';" "process.env.PASSWORD")
# then update in DB (psql example)
# replace PG_CONN (or use psql env vars), and ADMIN_EMAIL
PG_CONN="process.env.DATABASE_URL"
psql "$PG_CONN" -c "UPDATE users SET password = '${NODE_HASH//'$'/'\\$'}' WHERE email = 'process.env.EMAIL' AND role = 'process.env.ROLE';"
