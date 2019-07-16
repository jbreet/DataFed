import datafed
import datafed.CommandLib
import datafed.Config

def main():
    config = datafed.Config.API() #generate default configs
    datafed.CommandLib.init(config.getOpts()) #Config module will try to find things and send to MessageLib init
    returned = datafed.CommandLib.command('data create "Testing the Object Return" -a testobj -d "This is to test the object return of the exec function"')
    print(returned)

if __name__ == "__main__":
    main()