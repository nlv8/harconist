# Harconist

[Harcon](https://github.com/imrefazekas/harcon) extension for Visual Studio Code

## Features

### Entity Discovery and Completion

Harconist discovers Harcon entities in the current workspace and selected base directories. Completion is provided for discovered entity names.

### Function Discovery and Completion

Harconist discovers public functions of the previously discovered Harcon entities. Completion is provided for discovered functions along with their JSDoc documentation.

### Jump to Definition

Jump to the definition of Harcon functions.

## Usage

### Trigger Discovery

  0. Press <kbd>Ctrl</kbd>+<kbd>P</kbd> to open the command palette.
  0. Issue the `Harconist: Reload the available Harcon entities.` command.
  0. Harconist will reload the available entities.

### Completion

Completion is triggered by the `request` or `inform` functions.

Enter the one of the aforementioned function names, open the parameter list and enter either an apostrophe or a double quote. The name of the available entity names will pop-up.

After typing a dot, the pop-up will display the functions of the appropriate entity.

### Jump to Definition

Simply Ctrl-Click on a Harcon function name, passed as a parameter to a `request` or `inform` call.

## License

Harconist is licensed under [Apache-2.0](https://github.com/nlv8/harconist/blob/master/LICENSE).