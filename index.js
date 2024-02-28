import { ethers } from "ethers";
import {REST, Routes, Client, GatewayIntentBits, SlashCommandBuilder} from "discord.js"
import fs from "fs"
import "dotenv/config"

const {DISCORD_ID, DISCORD_TOKEN} = process.env;

// Get Data from JSON
const getData = JSON.parse(fs.readFileSync('./rpc.json', {encoding: 'utf8'}))

// Initiati Client Discord
const client = new Client({ intents : [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages]})

// Slash Command for Add RPC
const commands = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('for check api')
    .addStringOption(option => 
        option.setName('rpc')
        .setDescription('input your rpc')
        .setRequired(true))


        // Slash Command for Add RPC
const listRPC = new SlashCommandBuilder()
.setName('listrpc')
.setDescription('for check list RPC')
// Rest for add 
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  
// Send Rest
try {
  await rest.put(Routes.applicationCommands(DISCORD_ID), { body: [commands, listRPC] });
} catch (error) {
  console.error(error);
}

// Jika Client Menyala (Online)
client.on('ready', () => {
  try {
    console.log("Bot Online (+)");
  } catch(error) {
    console.error(error);
  }
});


// Ketika ada Message baru
client.on('messageCreate', async message => {
  if(message.content === 'ping') {
      message.reply('Pong!')
  }
})

// Ketika ada Interaction Baru
client.on('interactionCreate', async interaction => {
  if(interaction.commandName === 'ping') {
    const getInputRPC = interaction.options.getString('rpc');
    const getAPIDetails = getData.find(api => api.rpc == getInputRPC);
    if(getAPIDetails) {
      interaction.reply('Udah Pernah');
    } else {
      const pushToAPI = {
        rpc: getInputRPC,
        rpcID: `${getData.length + 1}`,
        username: interaction.user.username,
        getCount: 0
      };
  
      getData.push(pushToAPI); // Tambahkan data ke dalam array getData
      fs.writeFileSync("rpc.json", JSON.stringify(getData), { flag: 'a', encoding: 'utf-8' });
      interaction.reply('Berhasil Menambahkan');
    }
  }  

  if(interaction.commandName === 'listrpc') {
      const getRPCbyUsername = getData.filter(data => data.username == interaction.user.username)
      const response = JSON.stringify(getRPCbyUsername, null, 2);
      interaction.reply({content : response, ephemeral: true})
  }
})

// main for Execute RPC
async function main() {
    let totalGetCount = 0; // Menghitung total getCount untuk semua RPC

    // Loop melalui setiap entri data RPC
    getData.forEach(async (entry) => {
        const provider = new ethers.providers.JsonRpcProvider(entry.rpc);
        const balance = await provider.getBalance('vitalik.eth');
        
        // Menambahkan getCount untuk entri saat ini
        entry.getCount++;
        totalGetCount += entry.getCount;
        console.log(`Result For ${entry.rpcID} = ${ethers.utils.formatEther(balance)} ETH`)
        console.log(`getCount for ${entry.rpcID}: ${entry.getCount}`);
    });

    // Menulis ulang data yang telah diperbarui ke file rpc.json
    fs.writeFileSync('./rpc.json', JSON.stringify(getData, null, 2), { encoding: 'utf8' });
}

// SetInterval agar Main selalu di jalankan
setInterval(main, 30000); // Menjalankan main setiap 30 detik

client.login(DISCORD_TOKEN)