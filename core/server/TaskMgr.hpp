#ifndef TASKMGR_HPP
#define TASKMGR_HPP

#include <string>
#include <vector>
#include <deque>
#include <thread>
#include <mutex>
#include <condition_variable>
#include "Config.hpp"
#include "SDMS_Auth.pb.h"
#include "SDMS.pb.h"

namespace SDMS {
namespace CORE {

class TaskMgr
{
public:
    static TaskMgr & getInstance();

    void    transferData( XfrDataReply );
    //void    putData( const std::string& a_id, const std::string & a_path, XfrEncrypt a_encrypt, const std::string * a_ext = 0 );
    //void    moveData( const std::vector<std::string> & a_ids, const std::string & a_repo, XfrEncrypt a_encrypt );
    void    deleteData( const std::vector<std::string> & a_ids );

private:
    typedef std::vector<std::pair<std::string,std::string>> url_params_t;

    TaskMgr();
    ~TaskMgr();

    void        mainThread();
    void        httpInit( TaskInfo & a_task, bool a_post, const std::string & a_url_base, const std::string & a_url_path, const std::string & a_token, const url_params_t & a_params, const rapidjson::Document * a_body )

    class Task;

    Config &                    m_config
    std::deque<Task*>           m_q_ready;
    std::mutex                  m_q_mutex;
    std::condition_variable     m_q_condvar;
    std::vector<std::thread*>   m_workers;
    std::thread*                m_main_thread;
};

}}

#endif
