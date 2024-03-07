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

// Initiasi Client Discord
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

    // Slash Command for Total RPC
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

// If Client (Online)
client.on('ready', () => {
    try {
        console.log("Bot Online (+)");
    } catch (error) {
        console.error("Error during 'ready' event:", error);
    }
});

// If there new Message
client.on('messageCreate', async message => {
    try {
        if (message.content === 'ping') {
            message.reply('Pong!');
        }
    } catch (error) {
        console.error("Error during 'messageCreate' event:", error);
    }
});

// If There new Interaction
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
            // Maximum Character Discord
            const maxCharacterLength = 1999;
        
            if (response.length > maxCharacterLength) {
                const messages = [];
                let currentMessage = '';
        
                // Bagi pesan menjadi beberapa bagian
                let lines = response.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
        
                    if ((currentMessage + line).length > maxCharacterLength) {
                        messages.push(currentMessage);
                        currentMessage = '';
                    }
                    
                    currentMessage += line + '\n';
                }
        
                if (currentMessage.length > 0) {
                    messages.push(currentMessage);
                }
        
                interaction.reply({ content: messages.shift(), ephemeral: true }).then(() => {
                    messages.forEach((msg, index) => {
                        setTimeout(() => {
                            interaction.followUp({ content: msg, ephemeral: true });
                        }, (index + 1) * 500);
                    });
                }).catch(error => {
                    console.error('Error replying to interaction:', error);
                });
            } else {
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
        let totalGetCount = 0;

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

        fs.writeFileSync('./rpc.json', JSON.stringify(getData, null, 2), { encoding: 'utf8' });
    } catch (error) {
        console.error("Error during 'main' function execution:", error);
    }
}

setInterval(main, 60000);

// Login to Discord
try {
    client.login(DISCORD_TOKEN);
} catch (error) {
    console.error("Error during Discord login:", error);
}
