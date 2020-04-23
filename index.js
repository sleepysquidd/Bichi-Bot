const Discord = require('discord.js');
const config = require('./config.json');
const fs = require('fs');

var yay;
var selfassignroles = new Map();

const modules = './command_modules/';
var prefix = config.prefix;

const client = new Discord.Client();
const queue = new Map();

var commands = {};

fs.readdirSync(modules).forEach(function(i) {
    fs.readdirSync(`${modules}${i}`).forEach(function(n) {
        var rawName = n.split('.');
        if(rawName[1] == 'json') {
            var jsonDat = JSON.parse(fs.readFileSync(`${modules}${i}/${n}`));
            jsonDat.aliases.forEach(function(j) {
                eval(`commands['${j}'] = `+fs.readFileSync(`${modules}${i}/${rawName[0]+".code"}`));
            });
        }
    });
});

client.on("messageDelete", async msg => {
    if(msg.author.bot) return;
    //msg.channel.send(`Deleted message from ${msg.member.displayName}: ${msg.content}`);
});

client.on("ready", () => {
    var t1 = new Date();
    var guildCheck = [];
    client.guilds.forEach(function(i) {
        guildCheck.push(i.id);
    });

    guildCheck.forEach(function(i) {
        try {
            var dat = JSON.parse(fs.readFileSync(`./${i}/roles`));
            selfassignroles.set(i, dat.roles);
        } catch(err) {     
            if (!fs.exists(`./${i}`)) fs.mkdirSync(`./${i}`);
            fs.writeFileSync(`./${i}/roles`, `{"roles" : []}`);
            if (!fs.exists(`./${i}/reminders`)) fs.mkdirSync(`./${i}/reminders`);
            if (!fs.exists(`./${i}/reactions`)) fs.mkdir(`./${i}/reactions`);
        }
    });
    yay = `I am! ${client.emojis.find(e => e.name == "yayyy")}`;

    setInterval(function() {
        var t2 = new Date();
        client.guilds.forEach(function(i) {
            fs.readdirSync(`./${i.id}/reminders`).forEach(function(n) {
                if(n <= new Date().getTime()) {
                    var dat = JSON.parse(fs.readFileSync(`./${i.id}/reminders/${n}`));
                    let chan = i.channels.find(c => c.id == dat.channelid && c.type == 'text');
                    if(!chan) return console.log(`Channel missing`);
                    let usr = i.members.find(m => m.id == dat.userid);
                    chan.send(`${usr}`);
                    chan.send({
                        "embed": {
                            "title": `Reminder for ${usr.displayName}`,
                            "description": dat.message,
                            "color": 16748526,
                            "timestamp": new Date(parseInt(n))
                        }
                        });
                    fs.unlink(`./${i.id}/reminders/${n}`);
                }
            });
        });
    }, 60000);

    client.user.setPresence({
        'status': 'idle',
        'game': {
            'name': 'with my code!',
            'url': 'https://www.twitch.tv/sleepysquidd',
            'type': 'PLAYING'
        }
    });
});

client.on("guildCreate", async guild => {
    fs.mkdir(`./${guild.id}`);
    fs.writeFileSync(`./${guild.id}/roles`, `{"roles" : []}`);
    fs.mkdirSync(`./${guild.id}/reminders`);
    fs.mkdir(`./${guild.id}/reactions`);
});

client.on("guildMemberAdd", async mem => {
    if(fs.existsSync(`./${mem.guild.id}/welcomechannel`)) {
        var wChan = mem.guild.channels.find(chan => chan.id == fs.readFileSync(`./${mem.guild.id}/welcomechannel`) && chan.type == `text`);
        wChan.send(`Welcome, ${mem}, to the server! ${client.emojis.find(e => e.name == `yayyy`)}`);
    } else {
        console.log(`No welcome channel`);
    }
    if(fs.existsSync(`./${mem.guild.id}/welcomerole`)) {
        var wRole = mem.guild.roles.find(r => r.id == fs.readFileSync(`./${mem.guild.id}/welcomerole`));
        mem.addRole(wRole);
    }
});

client.on("guildMemberRemove", async mem => {
    if(fs.existsSync(`./${mem.guild.id}/welcomechannel`)) {
        var wChan = mem.guild.channels.find(chan => chan.id == fs.readFileSync(`./${mem.guild.id}/welcomechannel`) && chan.type == `text`);
        wChan.send(`Aww shoot, ${mem} left the server! ${client.emojis.find(e => e.name == `feelsbad`)}`);
    } else {
        console.log(`no welcome channel`);
    }
});

client.on("voiceStateUpdate", async (oldMem, newMem) => {
    if(oldMem.bot) return;
    try {
        var vcRole = newMem.guild.roles.find(r => r.id == fs.readFileSync(`./${newMem.guild.id}/voicerole`));
    } catch(err) {
        console.log('No voice channel role!');
    }
    if(!newMem.voiceChannel) {
        try {
            let logChan = newMem.guild.channels.find(c => c.id == fs.readFileSync(`./${newMem.guild.id}/privatelogchannel`) && c.type == `text`);
            logChan.send(`${newMem} left ${oldMem.voiceChannel}`);
        } catch(err) {
            console.log('No private log channel!');
        }
        if(vcRole) newMem.removeRole(vcRole);
    }
    try {
        let logChan = newMem.guild.channels.find(c => c.id == fs.readFileSync(`./${newMem.guild.id}/privatelogchannel`) && c.type == `text`);
        logChan.send(`${newMem} connected to ${newMem.voiceChannel}`);
    } catch(err) {
        console.log('No private log channel!');
    }
    if(vcRole) newMem.addRole(vcRole);
});

client.on("message", async msg => {
    if(msg.content.toLowerCase().includes("who") && msg.content.toLowerCase().includes("good") && msg.content.toLowerCase().includes("bot")) {
        return msg.channel.send(`${yay}`);
    }
    try {
        fs.readdirSync(`./${msg.guild.id}/reactions`).forEach(function(i) {
            if(msg.content === i) {
                return msg.channel.send(""+fs.readFileSync(`${msg.guild.id}/reactions/`+i));
            }
        });
    } catch(err) {}

    if(!msg.content.startsWith(prefix) || msg.author.bot) return;
    const serverQueue = queue.get(msg.guild.id);
    const command = msg.content.toLowerCase().split(" ")[0].substring(prefix.length);
    var args = msg.content.toLowerCase().split(" ").slice(1);
    if(args.length >1 ) args = args.join(" ");

    if (commands.hasOwnProperty(command)) {
        commands[command](args, msg, serverQueue);
    }
});

client.login(config.token);