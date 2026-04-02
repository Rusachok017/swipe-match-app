import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:postgres123@localhost:5432/swipe_match_db"

async def create_tables():
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.connect() as conn:
        # Создаём таблицу users
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                age INTEGER NOT NULL,
                gender VARCHAR(10) NOT NULL,
                bio TEXT,
                photo_url VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Создаём таблицу swipes
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS swipes (
                id SERIAL PRIMARY KEY,
                swiper_id INTEGER REFERENCES users(id),
                swiped_id INTEGER REFERENCES users(id),
                is_like BOOLEAN NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Создаём таблицу blacklist
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS blacklist (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                filter_type VARCHAR(10) NOT NULL,
                blocked_user_id INTEGER REFERENCES users(id),
                keyword VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Создаём таблицу whitelist
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS whitelist (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                filter_type VARCHAR(10) NOT NULL,
                priority_user_id INTEGER REFERENCES users(id),
                keyword VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        await conn.commit()
        print("✅ Таблицы созданы успешно!")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())