+++
title = "Executing Python Code Blocks on a Remote Server"
author = ["Guilherme Salome"]
lastmod = 2025-02-28T23:05:50-05:00
tags = ["org-mode", "babel", "python"]
categories = ["emacs"]
draft = false
+++

If you're working on a remote server but want to send Python code from Emacs running on your laptop, you can use an **inferior Python shell** that runs remotely. This tutorial shows how to configure Emacs to launch Python on a remote machine and correctly send code blocks from Org mode.


## Setting Up a Remote Python Launcher {#setting-up-a-remote-python-launcher}

First, create a script that will start Python on the remote server.

```bash {caption=alface}
#!/usr/bin/env bash
ssh myserver "python $@"

```

The command `python $@` ensures that any arguments passed to the script are forwarded to the Python interpreter on the remote server. In Bash, `$@` represents all command-line arguments given to the script, preserving their structure. This is important because Emacs, when launching an inferior Python shell, often provides arguments like `-i` for interactive mode, and this setup ensures that those arguments are correctly applied.

The script does not need to be simple. Prior to launching Python, you can run arbitrary commands, including loading modules in a cluster, changing directories, and activating virtual environments. For example:

```bash
#!/usr/bin/env bash
ssh my-hpc-login "
    qlogin -l my-super-computer; \
    cd ~/myproject; \
    source ./venv/bin/activate; \
    python $@
"

```

Make the script executable:

```bash
chmod +x remote-python

```


## Configuring Emacs to Use the Remote Python Shell {#configuring-emacs-to-use-the-remote-python-shell}

Now, tell Emacs to use this script as the Python interpreter:

```elisp
(setq python-shell-interpreter "/path/to/remote-python"
      python-shell-interpreter-args "-i"
      python-shell-completion-native-enable nil
      comint-max-line-length 100000) ;; Increase character limit to avoid writing to temp files

```

After this, running `M-x run-python` will start a Python process on the remote server.


## Making Org-Babel Send Code to the Remote Python Shell {#making-org-babel-send-code-to-the-remote-python-shell}

By default, Org-Babel tries to launch a new Python process when executing a code block. We want to avoid this and instead use an already-running Python shell started manually by the user. The following override ensures that Org-Babel sends code to the existing process instead of trying to create a new one.

```elisp
(defun my-org-babel-execute:python (body params)
  (let ((proc (python-shell-get-process)))
    (python-shell-send-string (concat body "\n") proc) ""))

(advice-add 'org-babel-execute:python :override #'my-org-babel-execute:python)

```


## Testing the Setup {#testing-the-setup}

Start the Python shell manually with `M-x run-python`.
Then, try running a Python code block in Org mode with `C-c C-c`:

```python
print("Hello, remote Python!")

```

You can also run Python code from any buffer containing Python code with the usual `python-shell-send-<method>` functions (e.g., sending a function definition or a region).

You are now sending code directly to an already-running process.
Notice that there are limitations on displaying the results back in the `:RESULTS` block, but at least you can now use arbitrary computing power.


## Conclusion {#conclusion}

Now, you can seamlessly run Python code on a remote server from Emacs using Org mode. This method ensures that:

1.  You start the Python shell manually with `M-x run-python`.
2.  Code is sent directly to the already-running process. The process can live anywhere and run arbitrary code before it begins.
3.  Long code blocks execute without running into writing code to temporary files on a remote server.
