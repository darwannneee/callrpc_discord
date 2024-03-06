import { ethers } from "ethers";
import { REST, Routes, Client, GatewayIntentBits, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import "dotenv/config";

const { DISCORD_ID, DISCORD_TOKEN } = process.env;

// Get Data from JSON
let getData = [];
try {
    getData = JSON.parse(fs.readFileSync('./rpc.json', { encoding: 'utf8' }));
} catch (error) {
    console.error("Error reading or parsing rpc.json:", error);
}

// Initiati Client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

// Slash Command for Add RPC
const commands = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('for check api')
    .addStringOption(option =>
        option.setName('rpc')
            .setDescription('input your rpc')
            .setRequired(true));

// Slash Command for List RPC
const listRPC = new SlashCommandBuilder()
    .setName('listrpc')
    .setDescription('for check list RPC');

    // Slash Command for List RPC
const totalRPC = new SlashCommandBuilder()
.setName('totalrpc')
.setDescription('for check total RPC upload on this BOT');

// Rest for add 
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// Send Rest
try {
    await rest.put(Routes.applicationCommands(DISCORD_ID), { body: [commands, listRPC, totalRPC] });
} catch (error) {
    console.error("Error sending REST command:", error);
}

// Jika Client Menyala (Online)
client.on('ready', () => {
    try {
        console.log("Bot Online (+)");
    } catch (error) {
        console.error("Error during 'ready' event:", error);
    }
});

// Ketika ada Message baru
client.on('messageCreate', async message => {
    try {
        if (message.content === 'ping') {
            message.reply('Pong!');
        }
    } catch (error) {
        console.error("Error during 'messageCreate' event:", error);
    }
});

// Ketika ada Interaction Baru
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.commandName === 'ping') {
            const getInputRPC = interaction.options.getString('rpc');
            const getAPIDetails = getData.find(api => api.rpc == getInputRPC);
            if (getAPIDetails) {
                interaction.reply('Udah Pernah');
            } else {
                const pushToAPI = {
                    rpc: getInputRPC,
                    rpcID: `${getData.length + 1}`,
                    username: interaction.user.username,
                    getCount: 0
                };

                getData.push(pushToAPI); // Tambahkan data ke dalam array getData
                fs.writeFileSync("rpc.json", JSON.stringify(getData));
                interaction.reply('Berhasil Menambahkan');
            }
        }

        if (interaction.commandName === 'listrpc') {
            const getRPCbyUsername = getData.filter(data => data.username == interaction.user.username);
            let response = '';
            getRPCbyUsername.forEach((rpcData, index) => {
                response += `${index + 1}. RPC ${index + 1}\n`;
                response += `   - RPC: ${rpcData.rpc}\n`;
                response += `   - RpcID: ${rpcData.rpcID}\n`;
                response += `   - Username: ${rpcData.username}\n`;
                response += `   - GetCount: ${rpcData.getCount}\n\n`;
            });
            
            response += `Total RPC uploaded by ${interaction.user.username} = ${getRPCbyUsername.length}`    
            // Maksimum karakter yang diizinkan dalam satu pesan Discord
            const maxCharacterLength = 1999;
        
            // Jika panjang pesan melebihi batas maksimum, potong pesan menjadi potongan yang lebih kecil
            if (response.length > maxCharacterLength) {
                const messages = [];
                let currentMessage = '';
        
                // Bagi pesan menjadi beberapa bagian
                let lines = response.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
        
                    // Jika penambahan baris berikutnya melebihi batas karakter, tambahkan pesan yang ada ke daftar pesan
                    if ((currentMessage + line).length > maxCharacterLength) {
                        messages.push(currentMessage);
                        currentMessage = '';
                    }
                    
                    currentMessage += line + '\n';
                }
        
                // Pastikan pesan terakhir ditambahkan
                if (currentMessage.length > 0) {
                    messages.push(currentMessage);
                }
        
                // Kirim pesan-pesan yang telah dibagi
                interaction.reply({ content: messages.shift(), ephemeral: true }).then(() => {
                    messages.forEach((msg, index) => {
                        setTimeout(() => {
                            interaction.followUp({ content: msg, ephemeral: true });
                        }, (index + 1) * 500); // Menambahkan penundaan untuk menghindari error InteractionNotReplied
                    });
                }).catch(error => {
                    console.error('Error replying to interaction:', error);
                });
            } else {
                // Jika panjang pesan kurang dari batas maksimum, kirim pesan langsung
                interaction.reply({ content: response, ephemeral: true }).catch(error => {
                    console.error('Error replying to interaction:', error);
                });
            }
        }        
        

        if (interaction.commandName === 'totalrpc') {
            interaction.reply(`Total semua RPC yang di upload = ${getData.length} RPC`);
        }
    } catch (error) {
        console.error("Error during 'interactionCreate' event:", error);
    }
});

// Main function for Execute RPC
async function main() {
    try {
        let totalGetCount = 0; // Menghitung total getCount untuk semua RPC

        // Loop through each RPC data entry
        for (const entry of getData) {
            try {
                const provider = new ethers.providers.JsonRpcProvider(entry.rpc);
                const balance = await provider.getBalance('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

                // Menambahkan getCount untuk entri saat ini
                entry.getCount++;
                totalGetCount += entry.getCount;
                console.log(`Result For ${entry.rpcID} = ${ethers.utils.formatEther(balance)} ETH`);
                console.log(`getCount for ${entry.rpcID}: ${entry.getCount}`);
            } catch (rpcError) {
                console.error(`Error processing RPC ${entry.rpcID}:`, rpcError);
            }
        }

        // Menulis ulang data yang telah diperbarui ke file rpc.json
        fs.writeFileSync('./rpc.json', JSON.stringify(getData, null, 2), { encoding: 'utf8' });
    } catch (error) {
        console.error("Error during 'main' function execution:", error);
    }
}

// SetInterval agar Main selalu di jalankan
setInterval(main, 60000); // Menjalankan main setiap 30 detik

// Login to Discord
try {
    client.login(DISCORD_TOKEN);
} catch (error) {
    console.error("Error during Discord login:", error);
}
