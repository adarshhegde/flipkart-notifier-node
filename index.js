const { Telegraf } = require('telegraf')
require("dotenv").config()
const bot = new Telegraf(process.env.BOT_TOKEN)
const https = require("https");
var HTMLParser = require('node-html-parser');
const express = require("express");
const cors = require("cors")
const server = express()

const MongoClient = require('mongodb').MongoClient;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


let target_ids = []

let commands = {}

let local_data = []


client.connect(async err => {

    if (err) process.exit(-1);

    local_data = await client.db("flipkart").collection("users").find({}).toArray() || {};
    console.log("Loaded from mongodb");
    console.log(local_data)
});


async function refreshLocal() {
    local_data = await client.db("flipkart").collection("users").find({}).toArray() || {};
}

/*
{"656459205":{"product_list":["https://www.flipkart.com/poco-x2-matrix-purple-128-gb/p/itm8715ce604cf32","https://www.flipkart.com/poco-x2-atlantis-blue-128-gb/p/itm36af4a9c20dd5"],"receive_updates":false},"886411758":{"receive_updates":true,"product_list":["https://www.flipkart.com/poco-x2-atlantis-blue-128-gb/p/itm36af4a9c20dd5","https://www.flipkart.com/poco-x2-matrix-purple-128-gb/p/itm8715ce604cf32"]}}
*/

server.use(cors());

// server.use(bot.webhookCallback('/secret-path'))
// bot.telegram.setWebhook('https://telegram-testing.herokuapp.com/secret-path')


// let local_data = { "656459205": { "product_list": ["https://www.flipkart.com/realme-5i-forest-green-64-gb/p/itmdac0da867a9fa", "https://www.flipkart.com/redmi-8-onyx-black-64-gb/p/itmebd23d8a2ed1b"], "receive_updates": true } }


server.get("/", (req, res) => res.send("keep_alive"));
server.get("/data", (req, res) => res.send(JSON.stringify(local_data)));


async function makeHttps(url) {
    return new Promise((respond, rej) => {



        https.get(url, res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
                body += data;
            });
            res.on("end", () => {
                respond(body);
            });
        });


    });
}

main()


function getUserDetails(user_id) {
    return user_id in local_data && local_data[user_id] || false;
}
function getUserProducts(user_id) {
    return user_id in local_data && local_data[user_id].product_list || false;
}

class Command {
    constructor({ command, description, func, args = [] }) {
        this.command = command;
        this.description = description;
        this.func = func;
        this.args = args;
    }
}

function addCommand(cmd) {
    commands[cmd.command] = (cmd)
}

addCommand(new Command({

    command: "help",
    description: "Read this help again",
    func: async (ctx) => {
        ctx.reply('Available commands are, ');
        ctx.reply((await bot.telegram.getMyCommands()).map(cmd => {
            return "/" + (cmd.command) + " " + cmd.description + "."
        }).join("\n"));
    }

}));

addCommand(new Command({

    command: "on",
    description: "Start receiving product status notifications",
    func: async (ctx) => {


        const user_id = ctx.chat.id;
        const collection = client.db("flipkart").collection("users");
        let check = await collection.findOne({ user_id });



        if (check) {
            if (check.receive_updates) {
                ctx.reply("You've already turned on updates.");
            } else {

                await collection.updateOne({
                    user_id,
                }, {

                    $set: {
                        receive_updates: true,
                    },
                });


                await ctx.reply("You will now receive updates to product's you've added.✅");
                if (check.product_list.length < 1)
                    await ctx.reply("Your products list is empty. Add a product using /add [flipkart_link]");

                refreshLocal();
            }
        } else {
            await collection.insertOne({
                user_id,
                product_list: [],
                receive_updates: true
            }
            );
            await ctx.reply("You will now receive updates to product's you've added.✅");
            ctx.reply("Your products list is empty. Add a product using /add [flipkart_link]");

            refreshLocal();
        }


    }

}));

addCommand(new Command({

    command: "off",
    description: "Stop receiving product status notifications.",
    func: async (ctx) => {



        const user_id = ctx.chat.id;
        const collection = client.db("flipkart").collection("users");
        let check = await collection.findOne({ user_id });



        if (check) {
            if (!check.receive_updates) {
                ctx.reply("Updates are already off.");
            } else {

                await collection.updateOne({
                    user_id,
                }, {

                    $set: {
                        receive_updates: false,
                    },
                });

                ctx.reply("Updates have been turned off.✅");

                refreshLocal();

            }
        } else {
            await collection.insertOne({
                user_id,
                product_list: [],
                receive_updates: false
            }
            );
            ctx.reply("Updates have been turned off.✅");
            ctx.reply("Your products list is empty. Add a product using /add [flipkart_link]");

            refreshLocal();
        }


    }

}));


addCommand(new Command({

    command: "removeall",
    description: "Remove all products added.",
    func: async (ctx) => {



        const user_id = ctx.chat.id;
        const collection = client.db("flipkart").collection("users");
        let check = await collection.findOne({ user_id });



        if (check) {
            if (check.product_list.length < 1) {
                ctx.reply("Updates are already off.");
            } else {

                await collection.updateOne({
                    user_id,
                }, {

                    $set: {
                        product_list: []
                    },
                });

                ctx.reply("Product list cleared.✅");

                refreshLocal();

            }
        } else {
            await collection.insertOne({
                user_id,
                product_list: [],
                receive_updates: false
            }
            );
            ctx.reply("Updates have been turned off.✅");
            ctx.reply("Your products list is empty. Add a product using /add [flipkart_link]");

            refreshLocal();
        }


    }

}));


addCommand(new Command({

    command: "add",
    description: "Add product to watchlist.",
    args: ["flipkart_link"],

    func: async function (ctx) {
        let msg_args = (ctx.update.message.text.trim()).split(" ");
        msg_args = msg_args.slice(1)
        if (msg_args.length < 1) {
            await ctx.reply("Usage: /" + this.command + " " + this.args.map(a => `[${a}]`).join(","));
            await ctx.reply(this.description);
        } else {
            msg_args = msg_args.join(" ").split("/add").join("").trim();

            if(msg_args.indexOf("https://www.flipkart.com/") == -1) {
                 ctx.reply("Invalid URL.");
                return ctx.reply("provide proper URL such as https://www.flipkart.com/poco-x2-matrix-purple-128-gb/p/itm8715ce604cf32");
            }

            const sanitized_url = msg_args.split('?')[0].trim();

            const user_id = ctx.chat.id;
            const collection = client.db("flipkart").collection("users");


            let check = await collection.findOne({ user_id });
            if (check && check.length < 1) {



                await collection.insertOne({
                    user_id,
                    product_list: [sanitized_url],
                    receive_updates: true,
                });

                await ctx.reply("Added product to watchlist. user didn't exist before");
                refreshLocal();
                return;
            } else {


                if (check.product_list.indexOf(sanitized_url) !== -1) {
                    return ctx.reply("product already added.");
                } else {
                    let temp = await collection.updateOne({
                        user_id,
                    }, {

                        $set: {
                            product_list: [sanitized_url, ...check.product_list]
                        },
                    });


                    await ctx.reply("Added product to watchlist. user existed before");
                    !check.receive_updates && await ctx.reply("You are not currently receiving updates, use /on to enable them.");

                    refreshLocal();
                }


            }

        }
    }

}));

addCommand(new Command({

    command: "remove",
    description: "Remove product from watchlist.",
    args: ["link_or_name"],
    func: async function (ctx) {
        let stuff = ctx.update.message.text.trim().split(" ");
        let args_boi = stuff.slice(1).join(" ").trim();

        const user_id = ctx.chat.id;
        const collection = client.db("flipkart").collection("users");

        if (args_boi.length > 0) {


            let check = await collection.findOne({ user_id });
            if (check) {


                if (check.product_list.length > 0) {

                    if (isNaN(args_boi)) {

                        let matched = false;

                        for (prod of check.product_list) {
                            if (args_boi === prod) { matched = prod; break; }
                        }

                        let deep_match = false;

                        if (matched) {

                            let local_pos = local_data.map(i => i.user_id).indexOf(user_id);

                            local_data[local_pos].product_list.splice(
                                local_data[local_pos].product_list.indexOf(prod), 1);

                            let temp = await collection.updateOne({
                                user_id,
                            }, {

                                $set: {
                                    product_list: local_data[local_pos].product_list
                                },
                            });

                            await ctx.reply("Removed " + prod);

                            refreshLocal();

                        }
                    } else {
                        const proper = parseInt(args_boi);
                        if (proper > 0 && proper <= check.product_list.length) {

                            let local_pos = local_data.map(i => i.user_id).indexOf(user_id);

                            local_data[local_pos].product_list.splice(proper - 1, 1);

                            await collection.updateOne({
                                user_id,
                            }, {

                                $set: {
                                    product_list: local_data[local_pos].product_list
                                },
                            });

                            ctx.reply("Removed " + check.product_list[proper - 1]);

                            refreshLocal();

                        } else {
                            ctx.reply("Invalid number.");
                        }
                    }

                } else {
                    ctx.reply("you have no products to remove.")
                }
            } else {
                ctx.reply("you have no products to remove.")
            }
        } else {
            await ctx.reply(this.description);
            await ctx.reply("Usage /" + this.command + " [product link or name]");
            let check = await collection.findOne({ user_id });
            if (check && check.product_list.length > 0) {
                await ctx.reply("Available products are:");
                for (let prod in check.product_list) {
                    await ctx.reply(parseInt(prod) + 1 + ",  " + check.product_list[prod]);
                }
            }
        }
    }

}));

addCommand(new Command({

    command: "status",
    description: "See details of products you've added.",

    func: async (ctx) => {
        const user_id = ctx.chat.id;
        const collection = client.db("flipkart").collection("users");
        let check = await collection.findOne({ user_id });

        console.log(check)

        if (check) {
            await ctx.reply("Receiving updates: " + (check.receive_updates ? "Yes" : "No"));
            await ctx.reply("Added products: " + (check.product_list.length > 0 ? check.product_list.join("\n") : "None"));
        } else {
            await ctx.reply("Receiving updates: No");
            await ctx.reply("Added products: None");
        }
    }

}));


//////////////////////////////////////////////////////////////////////////////////////

async function main() {

    await bot.launch()

    bot.telegram.setMyCommands(Object.keys(commands).map(cmd => {
        return {
            command: cmd,
            description: commands[cmd].args.map(a => `[${a}]`).join(",") + " " + commands[cmd].description
        };
    }))


    bot.start(async (ctx) => {

        const user_id = ctx.chat.id;
        const collection = client.db("flipkart").collection("users");

        try {

            let check = await collection.findOne({ user_id });
            if (check && check.length < 1) {


                await collection.insertOne({
                    user_id,
                    product_list: [],
                    receive_updates: false
                }
                );
            }

            ctx.reply('Welcome!');
            commands["help"].func(ctx);
        } catch (err) {
            ctx.reply("Something went wrong connecting to database. Try again after sometime.");
        }

    })

    Object.keys(commands).map(cmd => bot.command(cmd, commands[cmd].func.bind(commands[cmd])));

    server.listen(process.env.PORT || 5050);

    while (true) {

        // for (let user in local_data) {
        //     if (local_data[user].receive_updates) {
        //         console.log("------------------")
        //         console.log("user " + user + " products 👇");
        //         for (let product of local_data[user].product_list) {
        //             console.log("|| " + product.substring(0, 50).replace("https://www.flipkart.com/", ""));
        //             await checkProduct(product, user);
        //         }
        //         console.log("------------------")
        //     }
        // }

        for (const user of local_data) {
            const { user_id, product_list, receive_updates } = user;
            if (product_list.length < 1) continue;
            if (!receive_updates) continue;
            console.log("------------------")
            console.log("user " + user_id + " products 👇");
            for (let product of product_list) {
                console.log("|| " + product.substring(0, 50).replace("https://www.flipkart.com/", ""));
                await checkProduct(product, user);
            }
        }
        await new Promise((res, rej) => setTimeout(res, 1000));
    }

};


async function checkProduct(product, user) {
    try {

        let lenk = new URL(product);
        lenk = lenk.origin + lenk.pathname; // strip off trackers.
        let response = await makeHttps(lenk);
        var root = HTMLParser.parse(response);

        let outOfStock = await checkOutOfStock(root);
        let comingSoon = await checkComingSoon(root);

        if (outOfStock || comingSoon) {

            if (outOfStock) console.log("^ out of stock");
            else console.log("^ coming soon");

        } else {

            let buyNowandPriceVisible = await checkPriceAndBuyNow(root);

            if (user.receive_updates && buyNowandPriceVisible) {
                let title = root.querySelector("._35KyD6").text.trim();
                bot.telegram.sendMessage(user.user_id, title + " IS AVAILABLE, LINK -> " + product);

            }

        }

    } catch (err) {
        console.log(err)
    }
}

function checkOutOfStock(root) {
    return new Promise((resolve, reject) => {
        let out_of_stock = true;
        try {
            out_of_stock = (root.querySelector("._1mzTZn").text).trim() === "This item is currently out of stock";

        } catch (err) {
            out_of_stock = false;
        }
        resolve(out_of_stock);
    })
}

function checkComingSoon(root) {
    return new Promise((resolve, reject) => {
        let coming_soon = true;
        try {
            coming_soon = (root.querySelector("._9-sL7L").text).trim() === "Coming Soon";

        } catch (err) {
            coming_soon = false;
        }
        resolve(coming_soon);
    })
}

function checkPriceAndBuyNow(root) {
    return new Promise((resolve, reject) => {
        let result = false;
        try {

            let pricing_visible = (root.querySelector("._1vC4OE._3qQ9m1") && root.querySelector("._1vC4OE._3qQ9m1").text) || false;
            let buy_visible = (root.querySelector("._2AkmmA._2Npkh4._2kuvG8._7UHT_c") && root.querySelector("._2AkmmA._2Npkh4._2kuvG8._7UHT_c").text) || false;

            result = pricing_visible && buy_visible;

        } catch (err) {
            result = false;
        }
        resolve(result);
    })
}


/*



  try { // check for out of stock,
            let out_of_stock = (root.querySelector("._1mzTZn").text).trim() === "This item is currently out of stock";
            if(!out_of_stock) throw Error("");
            console.log("         out of stock");
        }
        catch (err) {

            try {

                let coming_soon = (root.querySelector("._9-sL7L").text).trim() === "Coming Soon";
                if(!coming_soon) throw Error("");
                console.log("         coming soon");

            } catch(err) {

            // check for stock

            let pricing_visible = (root.querySelector("._1vC4OE._3qQ9m1") && root.querySelector("._1vC4OE._3qQ9m1").text) || false;
            let buy_visible = (root.querySelector("._2AkmmA._2Npkh4._2kuvG8._7UHT_c") && root.querySelector("._2AkmmA._2Npkh4._2kuvG8._7UHT_c").text) || false;
            if (pricing_visible && buy_visible) {
                console.log("         Available");
                if (local_data[user].receive_updates) {

                    bot.telegram.sendMessage(user, "PRODUCT IS AVAILABLE, LINK -> " + product);
                }
            }
            }

        }





*/