use crate::config::Config;
use anyhow::{anyhow, Context};
use tokio::process::Command;

#[derive(Clone)]
pub struct Docker {
    cfg: Config,
}

impl Docker {
    pub fn new(cfg: Config) -> Self {
        Self { cfg }
    }

    pub fn container_name(&self, session_id: &uuid::Uuid) -> String {
        format!("lab-{}", session_id)
    }

    pub async fn create_container(&self, container_name: &str) -> anyhow::Result<()> {
        // sleep infinity -> контейнер “держится”, shell позже будет через docker exec
        let mut cmd = Command::new("docker");
        cmd.arg("run")
            .arg("-d")
            .arg("--name")
            .arg(container_name)
            .arg("--memory")
            .arg(&self.cfg.container_memory)
            .arg("--memory-swap")
            .arg(&self.cfg.container_memory)
            .arg("--cpus")
            .arg(&self.cfg.container_cpus)
            .arg("--pids-limit")
            .arg(self.cfg.container_pids.to_string())
            .arg("--read-only")
            .arg("--tmpfs")
            .arg("/tmp:rw,noexec,nosuid,size=64m")
            .arg("--tmpfs")
            .arg("/run:rw,noexec,nosuid,size=8m")
            .arg("--cap-drop")
            .arg("ALL")
            .arg("--security-opt")
            .arg("no-new-privileges:true")
            .arg("--label")
            .arg("dev-pantry.lab-manager=true")
            // network mode
            .arg("--network")
            .arg(&self.cfg.container_network)
            // user inside container
            .arg("--user")
            .arg(&self.cfg.container_user)
            .arg("--hostname")
            .arg(container_name)
            .arg(&self.cfg.lab_image)
            .arg("sleep")
            .arg("infinity");

        let out = cmd.output().await.context("failed to spawn docker")?;
        if !out.status.success() {
            return Err(anyhow!(
                "docker run failed: {}",
                String::from_utf8_lossy(&out.stderr)
            ));
        }
        Ok(())
    }

    pub async fn kill_container(&self, container_name: &str) -> anyhow::Result<()> {
        let out = Command::new("docker")
            .arg("kill")
            .arg(container_name)
            .output()
            .await
            .context("failed to spawn docker kill")?;

        // docker kill вернёт non-zero если контейнер уже остановлен — можно считать ok
        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr).to_string();
            if !err.contains("No such container") {
                tracing::warn!(container=%container_name, "docker kill non-zero: {}", err.trim());
            }
        }
        Ok(())
    }

    pub async fn remove_container(&self, container_name: &str) -> anyhow::Result<()> {
        let out = Command::new("docker")
            .arg("rm")
            .arg("-f")
            .arg(container_name)
            .output()
            .await
            .context("failed to spawn docker rm")?;

        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr).to_string();
            if !err.contains("No such container") {
                return Err(anyhow!("docker rm failed: {}", err.trim()));
            }
        }
        Ok(())
    }

    pub async fn ping(&self) -> anyhow::Result<()> {
        let out = Command::new("docker")
            .arg("info")
            .output()
            .await
            .context("failed to spawn docker info")?;

        if !out.status.success() {
            return Err(anyhow!(
                "docker info failed: {}",
                String::from_utf8_lossy(&out.stderr).trim()
            ));
        }

        Ok(())
    }

    pub async fn cleanup_managed_containers_on_startup(&self) -> anyhow::Result<usize> {
        let out = Command::new("docker")
            .arg("ps")
            .arg("-aq")
            .arg("--filter")
            .arg("label=dev-pantry.lab-manager=true")
            .output()
            .await
            .context("failed to spawn docker ps")?;

        if !out.status.success() {
            return Err(anyhow!(
                "docker ps failed: {}",
                String::from_utf8_lossy(&out.stderr).trim()
            ));
        }

        let ids = String::from_utf8_lossy(&out.stdout)
            .lines()
            .map(str::trim)
            .filter(|id| !id.is_empty())
            .map(ToOwned::to_owned)
            .collect::<Vec<_>>();

        for id in &ids {
            self.remove_container(id).await?;
        }

        Ok(ids.len())
    }

    pub async fn inspect_running(&self, container_name: &str) -> anyhow::Result<bool> {
        let out = Command::new("docker")
            .arg("inspect")
            .arg("-f")
            .arg("{{.State.Running}}")
            .arg(container_name)
            .output()
            .await
            .context("failed to spawn docker inspect")?;

        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr).to_string();
            if err.contains("No such container") {
                return Ok(false);
            }
            return Err(anyhow!("docker inspect failed: {}", err.trim()));
        }

        let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
        Ok(s == "true")
    }
}
