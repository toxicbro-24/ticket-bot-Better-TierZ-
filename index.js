require("dotenv").config();
const fs = require("fs");

const {
    Client,
    GatewayIntentBits,
    ChannelType,
    PermissionsBitField,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ⚙️ CONFIG
const PANEL_CHANNEL_ID = "1498296043173842984";
const TESTER_ROLE_ID = 1498173886305534032;

let ticketCount = 0;

// ================= READY =================
client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (!channel) return console.log("❌ Channel not found");

    let panelData = {};

    if (fs.existsSync("./panel.json")) {
        panelData = JSON.parse(fs.readFileSync("./panel.json"));
    }

    // Check if panel already exists
    if (panelData.messageId) {
        try {
            await channel.messages.fetch(panelData.messageId);
            console.log("✅ Panel already exists, not sending again");
            return;
        } catch {
            console.log("⚠️ Old panel missing, sending new one...");
        }
    }

    // Create panel
    const embed = new EmbedBuilder()
        .setTitle("🎟 Support Center")
        .setDescription("Click below to open a ticket.\n\nOur testers will help you.")
        .setColor("Purple");

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("open_ticket_button")
            .setLabel("Open Ticket")
            .setStyle(ButtonStyle.Primary)
    );

    const msg = await channel.send({
        embeds: [embed],
        components: [row]
    });

    // Save message ID
    fs.writeFileSync("./panel.json", JSON.stringify({
        messageId: msg.id
    }));

    console.log("✅ Panel created and saved");
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

    // BUTTONS
    if (interaction.isButton()) {

        if (interaction.customId === "open_ticket_button") {

            const modal = new ModalBuilder()
                .setCustomId("ticket_modal")
                .setTitle("Open Ticket");

            const nameInput = new TextInputBuilder()
                .setCustomId("name")
                .setLabel("Your Name")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const testInput = new TextInputBuilder()
                .setCustomId("test")
                .setLabel("What should be tested?")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(testInput)
            );

            await interaction.showModal(modal);
        }

        if (interaction.customId === "close_ticket") {
            await interaction.reply("🔒 Closing ticket in 5 seconds...");

            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 5000);
        }
    }

    // MODAL
    if (interaction.isModalSubmit()) {

        if (interaction.customId === "ticket_modal") {

            ticketCount++;

            const name = interaction.fields.getTextInputValue("name");
            const test = interaction.fields.getTextInputValue("test");

            const guild = interaction.guild;

            const channel = await guild.channels.create({
                name: `ticket-${ticketCount}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: TESTER_ROLE_ID,
                        allow: [PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });

            const embed = new EmbedBuilder()
                .setTitle("📩 New Ticket")
                .setColor("Blue")
                .addFields(
                    { name: "👤 Name", value: name },
                    { name: "🧪 Testing", value: test }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("close_ticket")
                    .setLabel("Close Ticket")
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({
                content: `<@${interaction.user.id}> <@&${TESTER_ROLE_ID}>`,
                embeds: [embed],
                components: [row]
            });

            await interaction.reply({
                content: `✅ Ticket created: ${channel}`,
                ephemeral: true
            });
        }
    }
});

client.login(process.env.TOKEN);
