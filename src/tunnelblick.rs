use std::error::Error;
use std::io::prelude::*;
use std::process::{Command, Stdio};

use tabwriter::TabWriter;

pub struct Client {
    script: String,
}

pub struct Cmd {
    name: String,
    args: Vec<String>,
}

impl Cmd {
    pub fn new() -> Cmd {
        Cmd {
            name: String::new(),
            args: Vec::new(),
        }
    }

    pub fn cmd(&mut self, name: &str) -> &mut Cmd {
        self.name = name.to_owned();
        self
    }

    pub fn arg(&mut self, arg: &str) -> &mut Cmd {
        self.args.push(arg.to_owned());
        self
    }

    pub fn args(&mut self, args: &[&str]) -> &mut Cmd {
        for arg in args {
            self.arg(arg);
        }
        self
    }

    pub fn encode(&self) -> String {
        return match self.name.as_ref() {
            "run" => String::from("run Tunnelblick"),
            _ => {
                format!("tell Tunnelblick to {}({})",
                        self.name,
                        // Quote all arguments when rendering script.
                        self.args
                            .iter()
                            .map(|arg| format!("{:?}", arg))
                            .collect::<Vec<String>>()
                            .join(","))
            }
        };
    }
}

pub fn cmd(name: &str) -> Cmd {
    let mut cmd = Cmd::new();
    cmd.cmd(name);
    cmd
}

impl Client {
    pub fn new() -> Client {
        Client { script: include_str!("tunnelblick.applescript").to_owned() }
    }

    fn compile_script(&self, command: &Cmd) -> String {
        return format!("{}\n{}", self.script, command.encode());
    }

    pub fn send(&self, command: &Cmd) -> String {
        let script = self.compile_script(command);

        let process = match Command::new("osascript")
            .arg("-")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn() {
            Err(why) => panic!("couldn't spawn osascript: {}", why.description()),
            Ok(process) => process,
        };

        match process.stdin.unwrap().write_all(script.as_bytes()) {
            Err(why) => panic!("couldn't write to osascript stdin: {}", why.description()),
            Ok(_) => {}
        }

        let mut s = String::new();
        match process.stdout.unwrap().read_to_string(&mut s) {
            Err(why) => panic!("couldn't read osascript stdout: {}", why.description()),
            Ok(_) => {}
        }

        match command.name.as_ref() {
            "showStatus" => {
                let mut tw = TabWriter::new(Vec::new());
                tw.write(s.as_bytes()).unwrap();
                tw.flush().unwrap();
                return String::from_utf8(tw.unwrap()).unwrap();
            }
            _ => return s,
        }
    }
}