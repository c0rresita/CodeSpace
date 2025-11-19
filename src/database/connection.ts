import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDatabase(): Promise<void> {
    try {
        if (!config.mongoUri) {
            console.warn('⚠️  MongoDB URI no configurada. El chat no se persistirá.');
            console.warn('   Configura MONGO_URI en el archivo .env para habilitar persistencia.');
            return;
        }

        await mongoose.connect(config.mongoUri);
        
        console.log('✅ Conectado a MongoDB');
        console.log(`   Base de datos: ${mongoose.connection.name}`);
        
        // Eventos de conexión
        mongoose.connection.on('error', (error) => {
            console.error('❌ Error de MongoDB:', error);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB desconectado');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconectado');
        });

    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error);
        console.warn('   El servidor continuará sin persistencia de chat.');
    }
}

export async function disconnectDatabase(): Promise<void> {
    try {
        await mongoose.disconnect();
        console.log('MongoDB desconectado');
    } catch (error) {
        console.error('Error al desconectar MongoDB:', error);
    }
}

export function isDatabaseConnected(): boolean {
    return mongoose.connection.readyState === 1;
}
